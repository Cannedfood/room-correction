export function declareWorker(desc: { [key: string]: (...args: any[]) => any }) {
	window.onmessage = async function(e: MessageEvent<any[]>) {
		const [name, referenceId] = e.data;
		const result = await desc[name](...e.data.slice(2));
		postMessage(referenceId, result);
	}
	return desc;
}

export function wrapWorker<WorkerDef>(port: Worker) {
	const resolveCallbacks = {} as { [ref: string]: any };

	function sendCommand(name: keyof WorkerDef, ...args: any[]) {
		return new Promise((resolve, reject) => {
			const refid = Math.random().toString();
			resolveCallbacks[refid] = resolve;
			port.postMessage([name, refid, ...args]);
		})
	}
	function signalDone(refid: string, value: any) {
		resolveCallbacks[refid](value);
		delete resolveCallbacks[refid];
	}

	port.onmessage = (e: MessageEvent<any[]>) => {
		const [refid, result] = e.data;
		signalDone(refid, result);
	};

	return {
		signalDone,
		sendCommand
	};
}
