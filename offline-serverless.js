const { spawn } = require('child_process');
const http = require('http');
const httpProxy = require('http-proxy');
const services = [
  {matchroute:'/dev/regions', route:'/' , path:"service=regions", port:3005},
  {matchroute:'/dev/subscriptions', route:'/' , path:"service=subscriptions", port:3008}
];


// Start `serverless offline` for each service
services.forEach(service => {
  const child = spawn('serverless', ['offline', 'start', '--httpPort', service.port, `--param=${service.path}`], {cwd: './'});
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => console.log(chunk));
  child.stderr.on('data', chunk => console.log(chunk));
  // child.on('close', code => console.log(`child exited with code ${code}`));
});

// Start a proxy server on port 8080 forwarding based on url path
const proxy = httpProxy.createProxyServer({});
const server = http.createServer(function(req, res) { 
  console.log("Route" , req.url)
  const service = services.find(per => req.url.match(per.matchroute));
  // Case 1: matching service FOUND => forward request to the service
  if (service) {
    req.url = req.url.replace(service.route, '');
    proxy.web(req, res, {target:`http://localhost:${service.port}`});
  }
  // Case 2: matching service NOT found => display available routes
  else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write(`Url path "${req.url}" does not match routes defined in services\n\n`);
    res.write(`Available routes are:\n`);
    services.map(service => res.write(`- ${service.route}\n`));
    res.end();
  }
});

// // This is the server port which all requests shall be made to
server.listen(8000);