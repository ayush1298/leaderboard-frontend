import { describe, expect, it } from 'vitest';
import type { ModelMeta, SummaryRow } from '$lib/types';
import { paretoFrontier, paretoStatus } from './pareto';

function row(name: string, activeParamsB: number | null, meanTask: number | null): SummaryRow {
	const model: ModelMeta = {
		name,
		displayName: name,
		org: '',
		zeroShotPct: 100,
		activeParamsB,
		totalParamsB: activeParamsB,
		embeddingDim: 768,
		maxTokens: 512,
		modelType: 'dense',
		instructionTuned: false,
		openWeights: true,
		sentenceTransformersCompatible: true
	};
	return {
		rank: 1,
		model,
		zeroShotPct: 100,
		activeParamsB,
		totalParamsB: activeParamsB,
		embeddingDim: 768,
		maxTokens: 512,
		meanTask,
		meanTaskType: meanTask,
		scoresByTask: {},
		scoresByTaskType: {}
	};
}

const sorted = (s: Set<string>) => [...s].sort();

describe('paretoFrontier', () => {
	it('keeps models no smaller model outscores', () => {
		const rows = [
			row('small', 0.1, 0.5),
			row('mid-better', 0.5, 0.6),
			row('mid-worse', 0.4, 0.45), // bigger than `small`, scores lower
			row('big-best', 7, 0.7),
			row('big-worse', 8, 0.65) // `big-best` is smaller and scores higher
		];
		expect(sorted(paretoFrontier(rows))).toEqual(['big-best', 'mid-better', 'small']);
	});

	it('drops the lower scorer among equal-sized models', () => {
		const rows = [row('a', 1, 0.6), row('b', 1, 0.5)];
		expect(sorted(paretoFrontier(rows))).toEqual(['a']);
	});

	it('drops a larger model that only matches a smaller one', () => {
		const rows = [row('small', 1, 0.6), row('big', 2, 0.6)];
		expect(sorted(paretoFrontier(rows))).toEqual(['small']);
	});

	it('keeps every model in an exact tie on both axes', () => {
		const rows = [row('a', 1, 0.6), row('b', 1, 0.6), row('c', 0.5, 0.4)];
		expect(sorted(paretoFrontier(rows))).toEqual(['a', 'b', 'c']);
	});

	it('ignores rows missing active params or Mean (Task)', () => {
		// Neither unplaceable row may land on, or knock anything off, the frontier.
		const rows = [row('known', 1, 0.5), row('no-params', null, 0.9), row('no-mean', 0.1, null)];
		expect(sorted(paretoFrontier(rows))).toEqual(['known']);
	});

	it('places 0-active-param static models at the small end', () => {
		const rows = [row('static', 0, 0.4), row('dense', 0.1, 0.5), row('worse-dense', 0.1, 0.3)];
		expect(sorted(paretoFrontier(rows))).toEqual(['dense', 'static']);
	});

	it('returns an empty set for no rows', () => {
		expect(paretoFrontier([]).size).toBe(0);
	});
});

describe('paretoStatus', () => {
	it('is null when the row cannot be placed or there is no frontier', () => {
		const frontier = new Set(['a']);
		expect(paretoStatus(row('a', null, 0.5), frontier)).toBeNull();
		expect(paretoStatus(row('a', 1, null), frontier)).toBeNull();
		expect(paretoStatus(row('a', 1, 0.5), undefined)).toBeNull();
	});

	it('reports membership for placeable rows', () => {
		const frontier = new Set(['a']);
		expect(paretoStatus(row('a', 1, 0.5), frontier)).toBe(true);
		expect(paretoStatus(row('b', 1, 0.4), frontier)).toBe(false);
	});
});
