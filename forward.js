#!/usr/bin/env node
'use strict';
const net = require('net');
console.log = console.error;

function show_usage() {
  console.log('Listen at a local port and forward connections to destination host:port.');
  console.log('Usage:');
  console.log('  forward.js [localAddress:]port [destHost:]port');
  console.log('Note:');
  console.log('  IPv6 address must be wrapped by square brackets, e.g. [::1]:8080');
  console.log('');
  console.log('You can press ENTER key to toggle Log level (default: 0 (none)).');
  console.log('When log level is 0, you can input transmission delay in milliseconds.');
}

function main(args) {
  if (args.length !== 2) {
    return show_usage();
  }

  let [localAddress, localPort] = split_host_port(args[0]);
  if (localPort.toString() !== split_host_port.port_s) {
    return console.log('invalid port: ' + split_host_port.port_s);
  }

  let [destHost, destPort] = split_host_port(args[1]);
  if (!destPort) {
    return show_usage();
  }
  if (destPort.toString() !== split_host_port.port_s) {
    return console.log('invalid port: ' + split_host_port.port_s);
  }
  destHost = destHost || 'localhost'

  console.log('Using parameters ' + JSON.stringify({localAddress, localPort, destHost, destPort}, null, '  '));

  let _l = 0; //log level.
  let _pass_through = ((callback) => callback());
  let _delay = 0;

  net.createServer({allowHalfOpen: true}, con => {
    _l && console.log(`${getLogPrefix()}Connected from ${braceIpv6(con.remoteAddress)}:${con.remotePort}, now connecting to ${braceIpv6(destHost)}:${destPort}`);
    const CON = net.connect({host: destHost, port: destPort}, () =>
        _l && console.log(`${getLogPrefix()}Connected to ${braceIpv6(CON.remoteAddress)}:${CON.remotePort} src ${braceIpv6(CON.localAddress)}:${CON.localPort}`));

    [
      {src: con, dst: CON, tag: `[${braceIpv6(con.remoteAddress)}:${con.remotePort} ---->> ${braceIpv6(destHost)}:${destPort}] `},
      {src: CON, dst: con, tag: `[${braceIpv6(con.remoteAddress)}:${con.remotePort} <<---- ${braceIpv6(destHost)}:${destPort}] `}
    ].forEach(v => {
      v.src
      .on('data', buf => {
        _delay && (v.dotted = true, process.stderr.write('.'));
        (_delay ? setTimeout : _pass_through)(() => {
          v.dst.write(buf);
          v.dotted && (v.dotted = false, process.stderr.write('\n'));
          _l === 2 && process.stdout.write(prependHeadToEachLine(buf, Buffer.from(getLogPrefix() + v.tag)));
        }, _delay);
      })
      .on('end', () => (v.dst.end(), _l && console.log(getLogPrefix() + v.tag + 'Ended')))
      .on('close', () => (v.dst.destroy(), _l && console.log(getLogPrefix() + v.tag + 'Closed')))
      .on('error', e => (v.dst.destroy(), _l && console.log(getLogPrefix() + v.tag + e)))
    });
  }).listen({host: localAddress, port: localPort}, function () {
    const logLevelDescs = ['Disabled', 'Show connection', 'Show connection && Dump all in/out packets'];

    console.log(`Listening at ${braceIpv6(this.address().address)}:${this.address().port}`);
    console.log(`Incoming connection will be forwarded to ${braceIpv6(destHost)}:${destPort}`);
    console.log('You can press ENTER key to toggle Log level (default: 0 (none)).');
    console.log('When log level is 0, you can input transmission delay in milliseconds.');

    //Optional: Read line from standard input to toggle log level
    require('readline').createInterface({input: process.stdin}).on('line', line => {
      line = line.replace(/\r?\n$/, '')
      if (_l === 0 && line.match(/^\d{1,16}$/)) {
        _delay = parseInt(line);
        console.log(`Set transmission delay = ${_delay} ms`);
      } else {
        console.log('Log level : ' + logLevelDescs[(_l = (_l + 1) % logLevelDescs.length)]);
        (_l === 0) && console.log('You can input transmission delay in milliseconds.');
      }
    });
  }).on('error', e => console.log('' + e));
}

function split_host_port(combo) {
  let m = combo.match(/^(\d+)$|^\[([^\]]*)\]:?(.*)$|^([^:]*):([^:]*)$|^(.*)$/);
  return [(m[2] || m[4] || m[6] || '').replace(/^\*$/, ''), (split_host_port.port_s = (m[1] || m[3] || m[5] || '')) & 0xffff];
}

const NO_NEWLINE = Buffer.from('<NO_NEWLINE>\n');

function prependHeadToEachLine(buf, headBuf) {
  let buf_ary = [headBuf, buf];
  for (; ;) {
    let lastBuf = buf_ary.pop();
    let nl_pos = lastBuf.indexOf(0xa); // find NEWLINE
    if (nl_pos < 0) {
      buf_ary.push(lastBuf);
      buf_ary.push(NO_NEWLINE);
      break;
    } else if (nl_pos === lastBuf.length - 1) {
      buf_ary.push(lastBuf);
      break;
    }
    buf_ary.push(lastBuf.slice(0, nl_pos + 1)); // include NEWLINE
    buf_ary.push(headBuf);
    buf_ary.push(lastBuf.slice(nl_pos + 1));
  }
  return Buffer.concat(buf_ary);
}

// prependHeadToEachLine(Buffer.from("a\nb\n"), Buffer.from("==> ")).toString()

function braceIpv6(ip) {
  if (ip.match(/^::ffff:\d+\.\d+\.\d+\.\d+$/)) {
    return ip.slice(7)
  }
  return ip.indexOf(':') >= 0 ? `[${ip}]` : ip;
}

function getLogPrefix() {
  return (new Date()).toISOString().slice(11, 23) + ' ';
}

main(process.argv.slice(2)); //nodejs args is start from the 3rd.
