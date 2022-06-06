export function declareWorker<T>(desc: T) {
	window.onmessage = async function(e: MessageEvent<any[]>) {
		const [name, referenceId] = e.data;
		const result = await desc[name](...e.data.slice(2));
		postMessage(referenceId, result);
	}
	return desc;
}

export function wrapWorker<WorkerDef>(port: Worker) {
	const resolve = {};

	function sendCommand(name: keyof WorkerDef, ...args: any[]) {
		return new Promise((resolve, reject) => {
			const refid = Math.random().toString();
			this.resolve[refid] = resolve;
			this.port.postMessage([name, refid, ...args]);
		})
	}
	function signalDone(refid: string, value: any) {
		resolve[refid](value);
		delete this.resolve[refid];
	}

	port.onmessage = (e: MessageEvent<any[]>) => {
		const [refid, result] = e.data;
		this._signalDone(refid, result);
	};

	return {
		signalDone,
		action: sendCommand
	};
}
