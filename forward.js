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
}

function main(args) {
  if (args.length !== 2) return show_usage();

  let [localAddress, localPort] = split_host_port(args[0]);
  if (localPort != split_host_port.port_s) return console.log('invalid port: ' + split_host_port.port_s);

  let [destHost, destPort] = split_host_port(args[1]);
  if (!destPort) return show_usage();
  if (destPort != split_host_port.port_s) return console.log('invalid port: ' + split_host_port.port_s);

  console.log('Using parameters ' + JSON.stringify({localAddress, localPort, destHost, destPort}, null, '  '));

  let _l = 0; //log level.

  net.createServer({allowHalfOpen: true}, con => {
    const tag = `\n[${con.remoteAddress}]:${con.remotePort} `;
    _l && console.log(tag + `Connected from [${con.remoteAddress}]:${con.remotePort} `);

    const TAG = tag;
    _l && console.log(TAG + `Connect to [${destHost}]:${destPort}`);

    const CON = net.connect({host: destHost, port: destPort}, () =>
      _l && console.log(TAG + `Connected to [${CON.remoteAddress}]:${CON.remotePort} source [${CON.localAddress}]:${CON.localPort}`));

    [{src: con, tag: tag, dst: CON}, {src: CON, tag: TAG, dst: con}].forEach(v => {
      v.src.on('data', buf => _l >= 2 && console.log(v.tag + (v.src == con ? '<REQ>' : '<RES>') + 'data'))
        .on('data', buf => (_l >= 2 && process.stdout.write(buf), v.dst.write(buf)))
        .on('end', () => (_l && console.log(v.tag + (v.src == con ? '<REQ>' : '<RES>') + 'EOF'), v.dst.end()))
        .on('close', () => (_l && console.log(v.tag + (v.src == con ? '<REQ>' : '<RES>') + 'closed'), v.dst.destroy()))
        .on('error', e => _l && console.log(v.tag + (v.src == con ? '<REQ>' : '<RES>') + e))
    });
  }).listen({host: localAddress, port: localPort}, function () {
    const logLevelDescs = ['No (default)', 'Show connection', 'Dump all req/res data'];

    console.log(`Listening at [${this.address().address}]:${this.address().port}`);
    console.log(`Incoming connection will be forwarded to [${destHost}]:${destPort}`);
    console.log('\nPress ENTER to toggle Log level.');
    console.log(logLevelDescs.reduce((sum, v, i) => sum + `  ${i}: ${v}\n`, ''));

    //Read line from standard input to toggle log level
    require('readline').createInterface({input: process.stdin}).on('line', line => console.log('Log level: ' + (_l = (_l + 1) % logLevelDescs.length) + ': ' + logLevelDescs[_l]));
  }).on('error', e => console.log('' + e));
}

function split_host_port(combo) {
  let m = combo.match(/^(\d+)$|^\[([^\]]*)\]:?(.*)$|^([^:]*):([^:]*)$|^(.*)$/);
  return [(m[2] || m[4] || m[6] || '').replace(/^\*$/, ''), (split_host_port.port_s = (m[1] || m[3] || m[5] || '')) & 0xffff];
}

main(process.argv.slice(2)); //nodejs args is start from the 3rd.
