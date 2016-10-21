# forward.js
An efficient port forwarding utility

## Why I made it
- On Windows, nc/ncat/socat.exe can not be trusted because they are not signed. 
- I want a prototype so can be easily modified to do more works such as dump, analyse data.
- I want to see connection info CLEARLY which almost not provided by nc/ncat/socat.
- The nc/ncat/socat's port forwarding are low efficiency or can not serve multiple connections.
- I don't want to remember complicated arguments for socat, and also nc which are distribution-dependent.

## Usage
(You can also install it by `npm install -g forward.js`)

Listen at a local port and forward incoming connections to other host:port.
```
forward.js [localAddress:]port [destHost:]port
```
Note: 
- IPv6 address must be wrapped by square brackets, e.g.\[::1\]:8080

##Samples
Forward TCP port 8080 of all interfaces, to a.b.c:9090
```
forward.js 8080 a.b.c:9090
```
Forward TCP port 8080 of all IPv4 interfaces to an IPv6 address's 9090 port
```
forward.js 0.0.0.0:8080 [2001:db8:a0b:12f0::1]:9090
```
Forward TCP port 8080 of all IPv6 interfaces to 192.168.1.12:9090
```
forward.js [::]:8080 192.168.1.12:9090
```

Screenshot:
```
$ forward.js 9999 www.google.com:80
Using parameters {
  "localAddress": "",
  "localPort": 9999,
  "destHost": "www.google.com",
  "destPort": 80
}
Listening at [::]:9999
Incoming connection will be forwarded to [www.google.com]:80

Press ENTER to toggle Log level. 0(default):no 1:connection log 2:dump data.

                  
Log level: 1

Log level: 2
[[::ffff:127.0.0.1]:56618] Connected from [::ffff:127.0.0.1]:56618 
<[::ffff:127.0.0.1]:56618 FWD> Connect to [www.google.com]:80
<[::ffff:127.0.0.1]:56618 FWD> Connected to [216.58.197.4]:80 source [192.168.11.3]:64287
[[::ffff:127.0.0.1]:56618] first data
GET / HTTP/1.1

<[::ffff:127.0.0.1]:56618 FWD> first data
HTTP/1.1 302 Found
...
[[::ffff:127.0.0.1]:56618] EOF
<[::ffff:127.0.0.1]:56618 FWD> EOF
[[::ffff:127.0.0.1]:56618] closed
<[::ffff:127.0.0.1]:56618 FWD> closed
```
Do not worry about the log of listening at `::`(all IPv6 interfaces),
**as far as i'v tested, on Windows and Mac OS X, listening at `::` will cause 
all IPv4 interfaces being listened either.(called dual-stack).**

Test client: (`nc-connect.js` is [here](https://github.com/sjitech/nc.js))
```
$ nc-connect.js 9999
Connected to 127.0.0.1:9999 source 127.0.0.1:56618
GET / HTTP/1.1

HTTP/1.1 302 Found
...
```
