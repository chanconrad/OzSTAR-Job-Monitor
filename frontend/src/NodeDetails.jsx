import React from 'react';
import PropTypes from 'prop-types';
import JobText from './JobText';
import PropChart from './PropChart';
import CorePie from './CorePie';

export default class NodeDetails extends React.Component {
  getCorePies() {
    const {
      selectedJobId,
      name,
      node,
      cpuKeys,
      jobs,
    } = this.props;
    // Cores belonging to selected job
    let jobCores = [];
    if (!(selectedJobId === null)) {
      const jobLayout = jobs[selectedJobId].layout;
      if (Object.prototype.hasOwnProperty.call(jobLayout, name)) {
        jobCores = jobLayout[name];
      }
    }
    const corePies = [];
    for (let i = 0; i < node.cpu.coreC.length; i += 1) {
      const core = node.cpu.coreC[i];
      let coreSelected = false;
      if (!(jobCores === null)) {
        coreSelected = jobCores.includes(i);
      }

      corePies.push(
        <CorePie
          key={i}
          type="cpu"
          data={[
            { name: 'user', data: core[cpuKeys.user] + core[cpuKeys.nice] },
            { name: 'wait', data: core[cpuKeys.wait] },
            { name: 'system', data: core[cpuKeys.system] },
            { name: 'idle', data: core[cpuKeys.idle] },
          ]}
          selected={coreSelected}
        />,
      );
    }
    return corePies;
  }

  getWarnings() {
    const {
      name,
      selectedJobId,
      warnings,
    } = this.props;
    const warningText = [];

    if (Object.prototype.hasOwnProperty.call(warnings, name)) {
      if (warnings[name].node.swapUse) {
        warningText.push('Node is using disk swap');
      }

      if (Object.prototype.hasOwnProperty.call(warnings[name].jobs, selectedJobId)) {
        const jobWarns = warnings[name].jobs[selectedJobId];
        if (jobWarns.cpuUtil) {
          warningText.push('Job underutilizes requested CPUs');
        }
        if (jobWarns.cpuWait) {
          warningText.push('Job spends significant time waiting');
        }
        if (jobWarns.memUtil) {
          warningText.push('Job underutilizes requested memory');
        }
      }
    }

    const warningList = [];
    if (warningText.length > 0) {
      for (let i = 0; i < warningText.length; i += 1) {
        const w = warningText[i];
        warningList.push(
          <div key={w} className="bad-job">
            Warning:
            {' '}
            {w}
          </div>,
        );
      }
    }
    return warningList;
  }

  getOtherJobList() {
    const {
      jobs,
      name,
      username,
      warnings,
      onJobClick,
    } = this.props;
    const otherJobList = [];
    const jobIds = Object.keys(jobs);
    for (let i = 0; i < jobIds.length; i += 1) {
      const jobId = jobIds[i];
      if (Object.prototype.hasOwnProperty.call(jobs[jobId].layout, name)) {
        if (!(jobs[jobId].username === username)) {
          let warnJob = false;
          if (Object.keys(warnings).length > 0) {
            warnJob = Object.prototype.hasOwnProperty.call(warnings[name].jobs, jobId);
          }
          otherJobList.push(
            <button type="button" key={jobId} className="cohab-job" onClick={() => onJobClick(jobId)}>
              <JobText
                key={jobId}
                id={jobId}
                job={jobs[jobId]}
                warn={warnJob}
              />
            </button>,
          );
        }
      }
    }
    return otherJobList;
  }

  getHistoryChart() {
    const {
      name,
      selectedJobId,
      getNodeUsage,
      cpuKeys,
      historyData,
    } = this.props;
    const historyChart = [];

    const sortedHistory = historyData;
    sortedHistory.sort(
      (a, b) => {
        if (a.timestamp < b.timestamp) {
          return -1;
        }
        if (a.timestamp > b.timestamp) {
          return 1;
        } return 0;
      },
    );

    for (let i = 0; i < sortedHistory.length; i += 1) {
      const data = sortedHistory[i];
      const nodeData = data.nodes[name];

      let jobMem = 0.0;
      let jobMemMax = 0.0;
      let jobMemRequested = 0.0;
      let jobUser = 0.0;
      let jobSystem = 0.0;
      let jobWait = 0.0;
      // Only if the job has started running
      if (Object.prototype.hasOwnProperty.call(data.jobs, selectedJobId)) {
        const job = data.jobs[selectedJobId];

        const usage = getNodeUsage(selectedJobId, data.jobs[selectedJobId], nodeData, name);

        // Memory usage
        if (Object.prototype.hasOwnProperty.call(job.mem, name)) {
          jobMem = usage.mem.used;
          jobMemMax = usage.mem.max;
          jobMemRequested = job.memReq;
        }

        // CPU usage
        jobUser = usage.cpu.user;
        jobSystem = usage.cpu.system;
        jobWait = usage.cpu.wait;
      }

      // IB usage
      let ibBytesIn = 0.0;
      let ibBytesOut = 0.0;
      let ibPktsIn = 0.0;
      let ibPktsOut = 0.0;

      if (nodeData.infiniband !== null) {
        ibBytesIn = nodeData.infiniband.bytes_in;
        ibBytesOut = nodeData.infiniband.bytes_out;
        ibPktsIn = nodeData.infiniband.pkts_in;
        ibPktsOut = nodeData.infiniband.pkts_out;
      }

      const d = new Date(data.timestamp * 1000);
      const x = {
        time: data.timestamp,
        timeString: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        user: nodeData.cpu.totalC[cpuKeys.user] + nodeData.cpu.totalC[cpuKeys.nice],
        system: nodeData.cpu.totalC[cpuKeys.system],
        wait: nodeData.cpu.totalC[cpuKeys.wait],
        mem: nodeData.mem.used * 1024 ** 2, // mb
        job_user: jobUser,
        job_system: jobSystem,
        job_wait: jobWait,
        job_mem: jobMem * 1024 ** 2, // mb
        job_mem_max: jobMemMax * 1024 ** 2, // mb
        job_mem_requested: jobMemRequested * 1024 ** 2, // mb
        swap: (nodeData.swap.total - nodeData.swap.free) * 1024 ** 2, // mb
        infiniband_in: ibBytesIn,
        infiniband_out: ibBytesOut,
        infiniband_pkts_in: ibPktsIn,
        infiniband_pkts_out: ibPktsOut,
        lustre_read: nodeData.lustre.read,
        lustre_write: nodeData.lustre.write,
        jobfs_read: nodeData.jobfs.read,
        jobfs_write: nodeData.jobfs.write,
      };
      for (let j = 0; j < nodeData.nGpus; j += 1) {
        const gpuName = `gpu${j.toString()}`;
        x[gpuName] = nodeData.gpus[gpuName];
      }
      historyChart.push(x);
    }
    return historyChart;
  }

  getGpuNames() {
    const { node } = this.props;
    const gpuNames = [];
    for (let i = 0; i < node.nGpus; i += 1) {
      const gpuName = `gpu${i.toString()}`;
      gpuNames.push(gpuName);
    }
    return gpuNames;
  }

  getPropCharts(historyChart, gpuNames) {
    const { node } = this.props;
    const style = getComputedStyle(document.documentElement);

    return (
      <div className="prop-charts">
        <PropChart
          name="CPU total"
          data={historyChart}
          dataKeys={['user', 'system', 'wait']}
          colors={[
            style.getPropertyValue('--piecolor-user'),
            style.getPropertyValue('--piecolor-system'),
            style.getPropertyValue('--piecolor-wait'),
          ]}
          lineStyle={[
            'fill',
            'fill',
            'fill',
          ]}
          unit="%"
          dataMax={100}
          stacked
        />
        <PropChart
          name="Memory"
          data={historyChart}
          dataKeys={['mem']}
          colors={[
            style.getPropertyValue('--piecolor-mem'),
          ]}
          lineStyle={[
            'fill',
          ]}
          unit="B"
          dataMax={node.mem.total * 1024 ** 2}
          stacked={false}
        />
        <PropChart
          name="Swap"
          data={historyChart}
          dataKeys={['swap']}
          colors={[
            style.getPropertyValue('--piecolor-wait'),
          ]}
          lineStyle={[
            'fill',
          ]}
          unit="B"
          dataMax={node.swap.total * 1024 ** 2}
          stacked={false}
        />
        <PropChart
          name="GPU"
          data={historyChart}
          dataKeys={gpuNames}
          colors={[
            style.getPropertyValue('--piecolor-gpu'),
          ]}
          lineStyle={[
            'fill',
          ]}
          unit="%"
          dataMax={100}
          stacked={false}
        />
        <PropChart
          name="InfiniBand traffic"
          data={historyChart}
          dataKeys={['infiniband_in', 'infiniband_out']}
          colors={[
            style.getPropertyValue('--piecycle-1'),
            style.getPropertyValue('--piecycle-2'),
          ]}
          lineStyle={[
            'fill',
            'fill',
          ]}
          unit="B/s"
          dataMax="dataMax"
          stacked={false}
        />
        <PropChart
          name="InfiniBand packet rate"
          data={historyChart}
          dataKeys={['infiniband_pkts_in', 'infiniband_pkts_out']}
          colors={[
            style.getPropertyValue('--piecycle-3'),
            style.getPropertyValue('--piecycle-4'),
          ]}
          lineStyle={[
            'fill',
            'fill',
          ]}
          unit="/s"
          dataMax="dataMax"
          stacked={false}
        />
        <PropChart
          name="Lustre access"
          data={historyChart}
          dataKeys={['lustre_read', 'lustre_write']}
          colors={[
            style.getPropertyValue('--piecycle-1'),
            style.getPropertyValue('--piecycle-2'),
          ]}
          lineStyle={[
            'fill',
            'fill',
          ]}
          unit="B/s"
          dataMax="dataMax"
          stacked={false}
        />
        <PropChart
          name="JOBFS access"
          data={historyChart}
          dataKeys={['jobfs_read', 'jobfs_write']}
          colors={[
            style.getPropertyValue('--piecycle-1'),
            style.getPropertyValue('--piecycle-2'),
          ]}
          lineStyle={[
            'fill',
            'fill',
          ]}
          unit="B/s"
          dataMax="dataMax"
          stacked={false}
        />
      </div>
    );
  }

  getJobPropCharts(historyChart) {
    const style = getComputedStyle(document.documentElement);

    const charts = [];

    charts.push(
      <PropChart
        key="cpu"
        name="CPU"
        data={historyChart}
        dataKeys={['job_user', 'job_system', 'job_wait']}
        colors={[
          style.getPropertyValue('--piecolor-user'),
          style.getPropertyValue('--piecolor-system'),
          style.getPropertyValue('--piecolor-wait'),
        ]}
        lineStyle={[
          'fill',
          'fill',
        ]}
        unit="%"
        dataMax={100}
        stacked
      />,
    );

    if (this.hasMemStats()) {
      charts.push(
        <PropChart
          key="mem"
          name="Memory"
          data={historyChart}
          dataKeys={['job_mem', 'job_mem_max', 'job_mem_requested']}
          colors={[
            style.getPropertyValue('--piecolor-mem'),
            style.getPropertyValue('--piecolor-mem'),
            style.getPropertyValue('--piecolor-mem'),
          ]}
          lineStyle={[
            'fill',
            'line',
            'dashed',
          ]}
          unit="B"
          stacked={false}
        />,
      );
    }

    return (
      <div className="prop-charts">
        {charts}
      </div>
    );
  }

  hasMemStats() {
    const {
      historyData,
      selectedJobId,
    } = this.props;

    for (let i = 0; i < historyData.length; i += 1) {
      const data = historyData[i];
      if (Object.prototype.hasOwnProperty.call(data.jobs, selectedJobId)) {
        if (data.jobs[selectedJobId].hasMem) {
          return true;
        }
      }
    }
    return false;
  }

  render() {
    const {
      name,
      username,
      node,
      selectedJobId,
      jobs,
      changeTimeWindow,
      timeWindow,
    } = this.props;
    if (username === null) {
      return null;
    } if (node === null) {
      return (
        <div className="main-item right">
          <div className="instruction">
            Select a running job to view nodes
          </div>
          <br />
          {selectedJobId === null ? null
            : (
              <div className="instruction">
                Select a node to view detailed system usage
              </div>
            )}
        </div>
      );
    }
    const corePies = this.getCorePies();

    const historyChart = this.getHistoryChart();
    const gpuNames = this.getGpuNames();

    const warningList = this.getWarnings();
    const otherJobList = this.getOtherJobList();

    return (
      <div className="main-item right">
        <div id="nodename-title">
          {selectedJobId}
          {' '}
          {(selectedJobId !== null) && 'on'}
          {' '}
          {name}
        </div>
        <div id="nodename-subtitle">
          {(selectedJobId !== null) && jobs[selectedJobId].name}
        </div>
        {warningList}

        <div className="time-selector">
          <label htmlFor="5h">
            <input
              type="radio"
              id="5h"
              name="timeWindow"
              value="5h"
              onChange={() => changeTimeWindow(18000)}
              checked={timeWindow === 18000}
            />
            5 hours
          </label>
          <label htmlFor="1h">
            <input
              type="radio"
              id="1h"
              name="timeWindow"
              value="1h"
              onChange={() => changeTimeWindow(3600)}
              checked={timeWindow === 3600}
            />
            1 hour
          </label>
          <label htmlFor="10m">
            <input
              type="radio"
              id="10m"
              name="timeWindow"
              value="10m"
              onChange={() => changeTimeWindow(600)}
              checked={timeWindow === 600}
            />
            10 minutes
          </label>
        </div>
        <br />
        <div className="heading">
          Job resource usage
        </div>

        {this.getJobPropCharts(historyChart)}

        <div className="heading">
          Node resource usage
        </div>
        <div>
          CPU cores
        </div>
        <div className="core-grid">
          {corePies}
        </div>

        {this.getPropCharts(historyChart, gpuNames)}

        {(otherJobList.length > 0)
        && (
          <div>
            <div className="job-names heading">
              Cohabitant jobs
            </div>
            <div>
              {otherJobList}
            </div>
          </div>
        )}
      </div>
    );
  }
}

NodeDetails.propTypes = {
  selectedJobId: PropTypes.string,
  name: PropTypes.string,
  username: PropTypes.string,
  node: PropTypes.objectOf(
    PropTypes.oneOfType([PropTypes.object, PropTypes.bool, PropTypes.number]),
  ),
  cpuKeys: PropTypes.objectOf(PropTypes.number).isRequired,
  jobs: PropTypes.objectOf(PropTypes.object),
  warnings: PropTypes.objectOf(PropTypes.object),
  onJobClick: PropTypes.func.isRequired,
  changeTimeWindow: PropTypes.func.isRequired,
  getNodeUsage: PropTypes.func.isRequired,
  timeWindow: PropTypes.number.isRequired,
  historyData: PropTypes.arrayOf(PropTypes.object),
};

NodeDetails.defaultProps = {
  selectedJobId: null,
  name: null,
  username: null,
  node: null,
  jobs: null,
  warnings: null,
  historyData: null,
};