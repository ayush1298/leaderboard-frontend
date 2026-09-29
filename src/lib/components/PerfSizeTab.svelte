<script lang="ts">
	import type { BenchmarkSummary } from '$lib/types';
	import { resolve } from '$app/paths';
	import {
		FRONTIER_COLOR,
		REFERENCE_COLOR,
		bestProprietaryRow,
		performanceSizePlot
	} from '$lib/charts/figures';
	import { fmtParamsCompact, fmtPct, modelPath } from '$lib/format';
	import { isParetoEligible } from '$lib/pareto';
	import { pinnedModels } from '$lib/stores/pinned.svelte';
	import PlotlyChart from './PlotlyChart.svelte';

	interface Props {
		summary: BenchmarkSummary;
	}
	let { summary }: Props = $props();
	let spec = $derived(performanceSizePlot(summary, pinnedModels.value));
	let hasProprietary = $derived(bestProprietaryRow(summary) !== null);
	// Same models the frontier line connects, smallest first — reads left to
	// right along the chart.
	let frontier = $derived(
		summary.rows
			.filter(isParetoEligible)
			.filter((r) => summary.paretoModels?.has(r.model.name))
			.sort((a, b) => a.activeParamsB - b.activeParamsB || b.meanTask - a.meanTask)
	);
	// `fmtParamsCompact` renders 0 as '—', but a static model's 0 active
	// params is a real value here.
	const fmtActive = (b: number) => (b === 0 ? '0 M' : fmtParamsCompact(b, ' '));
</script>

<div class="wrap" style:--frontier={FRONTIER_COLOR} style:--reference={REFERENCE_COLOR}>
	<p class="muted">
		Mean (Task) score vs. number of active parameters (log scale). Bubble size scales with embedding
		dimension; color shows max-token length. Hover a point for the model name.
	</p>
	<ul class="legend" aria-label="Chart lines">
		<li>
			<span class="swatch frontier" aria-hidden="true"></span>
			Pareto frontier (no model of equal or smaller size scores higher)
		</li>
		{#if hasProprietary}
			<li>
				<span class="swatch reference" aria-hidden="true"></span>
				Best proprietary model (most publish no size)
			</li>
		{/if}
	</ul>
	<div class="layout">
		<div class="chart">
			<PlotlyChart data={spec.data} layout={spec.layout} height={520} />
		</div>
		{#if frontier.length > 0}
			<aside class="pareto" aria-labelledby="pareto-heading">
				<h3 id="pareto-heading">
					Pareto optimal <span class="count">{frontier.length}</span>
				</h3>
				<ol>
					{#each frontier as row (row.model.name)}
						<li data-model-type={row.model.modelType}>
							<a
								class="name"
								href={resolve('/models/[...name=modelName]', { name: modelPath(row.model.name) })}
								title={row.model.name}
							>
								<span class="tbl-model-name">{row.model.displayName}</span>
							</a>
							<span class="score">{fmtPct(row.meanTask)}</span>
							<span class="size">{fmtActive(row.activeParamsB)}</span>
						</li>
					{/each}
				</ol>
			</aside>
		{/if}
	</div>
</div>

<style>
	.wrap {
		padding-top: 8px;
	}
	/* Base `.muted` (color + margin: 0) lives in src/app.css. */
	.muted {
		margin: 0 0 8px;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 20px;
		margin: 0 0 12px;
		padding: 0;
		list-style: none;
		font-size: 12px;
		color: var(--text-muted);
	}
	.legend li {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.swatch {
		width: 22px;
		border-top: 2.5px solid var(--frontier);
	}
	.swatch.reference {
		border-top: 1.5px dashed var(--reference);
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 240px;
		gap: 16px;
		align-items: start;
	}
	.chart {
		min-width: 0;
	}
	/* Capped to the chart's 520px height; long frontiers scroll inside. */
	.pareto {
		display: flex;
		flex-direction: column;
		max-height: 520px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		overflow: hidden;
	}
	h3 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 10px 12px 8px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	.count {
		padding: 0 7px;
		border-radius: 999px;
		background: var(--surface-muted);
		color: var(--ink-strong);
		font-variant-numeric: tabular-nums;
		line-height: 18px;
	}
	ol {
		margin: 0;
		padding: 0 6px 6px;
		list-style: none;
		overflow-y: auto;
	}
	/* Name on top (long names wrap rather than truncate), score + size beneath. */
	.pareto li {
		display: grid;
		grid-template-columns: 6px minmax(0, 1fr) auto;
		grid-template-areas:
			'dot name name'
			'. score size';
		column-gap: 8px;
		padding: 5px 6px;
		border-radius: 6px;
	}
	.pareto li:hover {
		background: var(--row-hover);
	}
	/* Dot in the frontier line's color ties each entry to the chart. */
	.pareto li::before {
		content: '';
		grid-area: dot;
		/* Pinned to the first line of the name, which may wrap. */
		align-self: start;
		margin-top: 6px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--frontier);
	}
	.name {
		grid-area: name;
		font-size: 13px;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
	.score,
	.size {
		font-size: 11px;
		color: var(--text-subtle);
		font-variant-numeric: tabular-nums;
	}
	.score {
		grid-area: score;
	}
	.size {
		grid-area: size;
	}
	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.pareto {
			max-height: 320px;
		}
	}
</style>
