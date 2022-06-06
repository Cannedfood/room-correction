import _ from 'lodash';

export function resize(
	data: Float32Array,
	size: number,
	copyBehavior: 'always-copy' | 'copy-if-necessary' = 'copy-if-necessary')
{
	if(data.length == size) {
		if(copyBehavior == 'always-copy')
			return new Float32Array(data);
		else
			return data;
	}
	else if(size <= data.length) {
		return data.subarray(0, size);
	}
	else {
		const result = new Float32Array(size);
		for(let i = 0; i < data.length; i++)
			result[i] = data[i];
		return result;
	}
}

export function vectorAverage(...data: Float32Array[]) {
	const result = new Float32Array(_.max(data.map(d => d.length))!);
	for(let i = 0; i < result.length; i++) {
		let n = 0;
		for(let d of data) {
			if(d.length > i) {
				result[i] += d[i];
				n++;
			}
		}
		result[i] /= n;
	}
	return result;
}
