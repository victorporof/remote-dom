import EventEmitter from "events";

export class RtcReceivers extends EventEmitter {
  constructor(renderer) {
    super();
    this._renderer = renderer;
  }

  receiveIceCandidate({ id, candidate }) {
    if (!candidate) {
      // Null means end-of-candidates notification.
      return;
    }
    const peerConnection = this._renderer.getPeerConnectionFromRemoteID(id);
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async receiveOffer({ id, offer: description }) {
    if (!description) {
      console.error(`Offer contains no session description for id: ${id}.`);
      return;
    }
    const sessionDescription = new RTCSessionDescription(description);
    const peerConnection = this._renderer.getPeerConnectionFromRemoteID(id);
    await peerConnection.setRemoteDescription(sessionDescription);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    this.emit("message", { is: "rtc:answer", id, answer });
  }
}
