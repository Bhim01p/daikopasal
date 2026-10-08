// Do not acknowledge an order, login or upload until its database commit succeeds.
export function bufferedResponse(response) {
  let status = 200;
  let content;
  const headers = new Map();
  return {
    headersSent: false,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    writeHead(code, values = {}) {
      status = code;
      for (const [name, value] of Object.entries(values))
        this.setHeader(name, value);
      this.headersSent = true;
      return this;
    },
    end(value) {
      content = value;
      return this;
    },
    flush() {
      response.writeHead(status, Object.fromEntries(headers));
      response.end(content);
    },
  };
}
