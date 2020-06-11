export class RtcReceivers {
  constructor(renderer) {
    this._renderer = renderer;
  }

  start() {
    window.addEventListener("message", this._onMessage.bind(this));
  }

  _onMessage({ data: { type, ...message } }) {
    if (type == "rtc:ice-candidate") {
      this._onIceCandidate(message);
    } else if (type == "rtc:offer") {
      this._onOffer(message);
    }
  }

  _onIceCandidate({ id, candidate }) {
    if (!candidate) {
      // Null means end-of-candidates notification.
      return;
    }
    const peerConnection = this._renderer.getPeerConnectionFromRemoteID(id);
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async _onOffer({ id, offer: description }) {
    if (!description) {
      console.error(`Offer contains no session description for id: ${id}.`);
      return;
    }
    const sessionDescription = new RTCSessionDescription(description);
    const peerConnection = this._renderer.getPeerConnectionFromRemoteID(id);
    await peerConnection.setRemoteDescription(sessionDescription);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    parent.postMessage({ is: "rtc:answer", id, answer }, "*");
  }
}
