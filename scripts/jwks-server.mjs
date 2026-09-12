import { createPublicKey } from "node:crypto";
import http from "node:http";

const port = Number(process.env.JWKS_PORT ?? 8787);
const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtqK50jNk7wBkrEan/pBo
yUFsR2rOH9kxnZ/e/LypdKq+d7ZL1Rf00CNhX92SL8R92x3qu+CZfSP4rSXZDL8c
cZPS76WheXXrSD7J7wrCTsugKiwlKYlyiM0gHgW8W3Z23lfijtEbNrloQgSk9MIX
ShuDeteJU3BgPJvZGnDv56cYKQuAAmK+4s98gYK2l/96RXbKaCk1nqMQQgWSAehj
9BNQohjSUhT8ZUBSwKnLX3mbF9LOzjY/0dQ2fRpf5kRBeE2i85aU6FydBNMenylp
gKaQc7y2cOu74BLqYx1So1zSs3FkqSb2V9KNPapH+pvPp0U0cloKi3ivdSZ6b7N5
DwIDAQAB
-----END PUBLIC KEY-----`;

const jwk = {
  ...createPublicKey(publicKeyPem).export({ format: "jwk" }),
  kid: "rsa-test-key",
  alg: "RS256",
  use: "sig",
};

const server = http.createServer((request, response) => {
  if (request.url === "/.well-known/jwks.json") {
    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type": "application/json",
    });
    response.end(JSON.stringify({ keys: [jwk] }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`JWKS server: http://127.0.0.1:${port}/.well-known/jwks.json`);
});
