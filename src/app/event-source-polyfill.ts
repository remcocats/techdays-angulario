// https://github.com/remy/polyfills/blob/master/EventSource.js

const reTrim = /^(\s|\u00A0)+|(\s|\u00A0)+$/g;

enum STATE {
  CONNECTING = 0,
  OPEN = 1,
  CLOSED = 2
}

class MessageEvent {
  type: string;

  constructor(public data: any, public origin: string, public lastEventId: string) {
    this.type = 'message';
    this.data = data || null;
    this.lastEventId = lastEventId || '';
  }
}

class EventSourcePolyfill {
  interval = 500; // polling interval
  lastEventId = null;
  cache = '';
  readyState: STATE;
  _pollTimer = null;
  _xhr = null;

  constructor(private url: string) {
    if (!url || typeof url !== 'string') {
      throw new SyntaxError('Not enough arguments');
    }
    console.log('EventSource created setting state to CONNECTING');
    this.readyState = STATE.CONNECTING;
    this.pollAgain(this.interval);
  }

  pollAgain(interval) {
    this._pollTimer = setTimeout(() => {
      this.poll();
    }, interval);
  }

  poll() {
    const eventId = this.lastEventId;
    console.log('Polling...');
    try { // force hiding of the error message... insane?
      if (this.readyState === STATE.CLOSED) {
        return;
      }

      // NOTE: IE7 and upwards support
      const xhr = new XMLHttpRequest();
      xhr.open('GET', this.url, true);
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.setRequestHeader('Cache-Control', 'no-cache');
      // we must make use of this on the server side if we're working with Android - because they don't trigger
      // readychange until the server connection is closed
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

      if (this.lastEventId != null) {
        xhr.setRequestHeader('Last-Event-ID', this.lastEventId);
      }
      this.cache = '';

      xhr.timeout = 10000;
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 3 || (xhr.readyState === 4 && xhr.status === 200)) {
          // on success
          if (this.readyState === STATE.CONNECTING) {
            console.log('Made connection setting state to OPEN');
            this.readyState = STATE.OPEN;
            this.dispatchEvent('open', { type: 'open' });
          }

          let responseText = '';
          try {
            responseText = xhr.responseText || '';
          } catch (e) {}

          // process this.responseText
          const parts = responseText.substr(this.cache.length).split('\n');
          let eventType = 'message';
          let data = [];
          let i = 0;
          let line = '';
          let retry = 0;

          this.cache = responseText;

          // TODO handle 'event' (for buffer name), retry
          for (; i < parts.length; i++) {
            line = parts[i].replace(reTrim, '');

            if (line.indexOf('event') === 0) {
              eventType = line.replace(/event:?\s*/, '');

            } else if (line.indexOf('retry') === 0) {
              retry = parseInt(line.replace(/retry:?\s*/, ''), 0);

              if (!isNaN(retry)) {
                this.interval = retry;
              }

            } else if (line.indexOf('data') === 0) {
              const dataLine = line.replace(/data:?\s*/, '');
              data.push(dataLine);

            } else if (line.indexOf('id:') === 0) {
              const lastEventId = line.replace(/id:?\s*/, '');
              this.lastEventId = lastEventId;

            } else if (line.indexOf('id') === 0) { // this resets the id
              this.lastEventId = null;

            } else if (line === '') {
              if (data.length) {
                const event = new MessageEvent(data.join('\n'), this.url, this.lastEventId);
                this.dispatchEvent(eventType, event);
                data = [];
                eventType = 'message';

              } else {

                console.log('Comparing ' + eventId + ' with ' + this.lastEventId);
                if (eventId === this.lastEventId) {
                  this.readyState = STATE.CONNECTING;
                  this.dispatchEvent('error', { type: 'error' });
                }
              }
            }
          }

          if (xhr.readyState === 4) {
            this.pollAgain(this.interval);
          }

          // don't need to poll again, because we're long-loading
        } else if (this.readyState !== STATE.CLOSED) {
          if (xhr.readyState === 4) { // and some other status
            // dispatch error
            console.log('Comparing ' + eventId + ' with ' + this.lastEventId);
            if (eventId === this.lastEventId) {
              this.readyState = STATE.CONNECTING;
              this.dispatchEvent('error', { type: 'error' });
            }
            this.pollAgain(this.interval);

          } else if (xhr.readyState === 0) { // likely aborted
            this.pollAgain(this.interval);

          } else {
          }
        }
      };

      xhr.send();

      setTimeout(function () {
        if (true || xhr.readyState === 3) {
          xhr.abort();
        }
      }, xhr.timeout);

      this._xhr = xhr;

    } catch (e) { // in an attempt to silence the errors
      this.dispatchEvent('error', { type: 'error', data: e.message }); // ???
    }
  }

  close() {
    // closes the connection - disabling the polling
    console.log('EventSource closing setting state to CLOSED');
    this.readyState = STATE.CLOSED;
    clearInterval(this._pollTimer);
    this._xhr.abort();
  }

  dispatchEvent(type, event) {
    const handlers = this['_' + type + 'Handlers'];
    if (handlers) {
      for (let i = 0; i < handlers.length; i++) {
        handlers[i].call(this, event);
      }
    }

    if (this['on' + type]) {
      this['on' + type].call(this, event);
    }
  }

  addEventListener(type, handler) {
    if (!this['_' + type + 'Handlers']) {
      this['_' + type + 'Handlers'] = [];
    }

    this['_' + type + 'Handlers'].push(handler);
  }

  removeEventListener(type, handler) {
    const handlers = this['_' + type + 'Handlers'];
    if (!handlers) {
      return;
    }
    for (let i = handlers.length - 1; i >= 0; --i) {
      if (handlers[i] === handler) {
        handlers.splice(i, 1);
        break;
      }
    }
  }
}

export default EventSourcePolyfill;
