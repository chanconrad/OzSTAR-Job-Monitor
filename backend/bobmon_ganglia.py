import bobmon_config as config
import socket

class Stats:
    def __init__(
        self,
        do_cpus = False,
        report_time_only = False,
        quiet = False,
        dead_timeout = 120,
    ):
        self.mem = {}  # dict of mem usage
        self.disk = {}  # dict of disk usage
        self.swap = {}  # dict of swap usage
        self.temps = {}  # dict of temperatures
        self.power = {}  # dict of watts used
        self.fans = {}  # dict of fan speeds
        self.gpu_util = {}  # dict of gpu loads
        self.all = None

        # standard ganglia metrics
        metrics = ['mem_free', 'mem_cached', 'mem_shared', 'mem_buffers', 'mem_total', 'disk_free', 'disk_total',
                   'swap_free', 'swap_total', 'boottime']

        # CPU metrics
        if do_cpus:
            metrics.extend(['load_one', 'cpu_user', 'cpu_nice', 'cpu_system', 'cpu_idle', 'cpu_wio', 'cpu_num'])

        # extra metrics defined in config
        metrics.extend(config.EXTRA_GANGLIA_METRICS)

        gmond_count = 0
        for host, port, url in config.GMONDS:
            xml = self.read(host, port)

            if xml is None:
                print('No data from [host, port]', host, port)
                continue

            data = self.parse_xml(xml, metrics, report_time_only)

            # tag this set of hosts with which gmond group they came from
            # so that later on the web stuff can reference the correct url
            self.tag_by_gmond_group(data, gmond_count)
            gmond_count += 1

            # merge data from each gmond into self.all
            self.merge(data)

    def read(selfself, host, port):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.connect((host, port))
        except:
            return None

        xml = ''
        data = 1
        while True:
            data = sock.recv(102400)
            if not data:
                break
            xml += str(data)
        sock.shutdown(2)

        xml = xml.replace('\\n', ' ').split(' ')

        if len(xml) == 0:
            xml = None

        return xml

    def parse_xml(selfself, xml, metrics, report_time_only):
        all = {}
        host = None
        i = 0

        if report_time_only:
            while i < len(xml):
                if xml[i] == '<HOST':
                    i += 1  # assume the NAME= field is the next one
                    host = xml[i].split('"')[1]

                    i += 2
                    if xml[i][:4] == 'TAGS':  # must be ganglia 3.2.0
                        i += 1

                    reported = xmlData[i].split('"')[1]
                    all[host] = {'reported': int(reported)}
                    i += 1

                i += 1

            return all

        while i < len(xml):
            if xml[i] == '<METRIC':
                i += 1  # assume the NAME= field is the next one
                metric = xml[i].split('"')[1]
                i += 1

                if metric in metrics:
                    val = xml[i].split('"')[1]
                    i += 1  # assume the VAL= field is the next one
                    all[host][metric] = val

            elif xml[i] == '<HOST':
                i += 1  # assume the NAME= field is the next one
                host = xml[i].split('"')[1]

                i += 2
                if xml[i][:4] == 'TAGS':  # must be >= ganglia 3.2.0
                    i += 1

                reported = xml[i].split('"')[1]
                all[host] = {'reported': int(reported)}
                i += 1

            i += 1

        return all

    def tag_by_gmond_group(self, data, count):
        for k in data.keys():
            data[k]['gmondGroup'] = count

    def merge(self, data):
        if self.all == None:
            self.all = data
            return

        # Very simplistic merge. could check field completeness etc.
        for k in data.keys():
            if k not in self.all.keys():
                self.all[k] = data[k]