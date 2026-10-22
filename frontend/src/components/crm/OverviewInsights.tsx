import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCrmStore } from '../../store/crmStore';
import { ChartCard } from '../charts/ChartCard';
import { ChartLegend, ColumnChart, type ColumnSeries } from '../charts/ColumnChart';
import { BarList } from '../charts/BarList';
import { PlatformIcon } from '../ui/SocialIcons';
import { platformOfLabel } from '../../utils/insights';
import { LineChart } from '../charts/LineChart';
import { getStage } from '../../utils/campaign';
import {
  average, countBy, DELIVERY_BINS, deliveryDays, median, monthlyActivity, PROFILE_FIELDS, reviewPlatform, reviewRateByProduct,
  weeklyTimeline,
} from '../../utils/insights';

// Validated categorical pair (blue, orange) for the one two-series chart; single-series charts use blue
const BLUE = '#2a78d6';
const ORANGE = '#eb6834';
const MONTH_SERIES: ColumnSeries[] = [
  { key: 'orders', label: 'Orders placed', color: BLUE },
  { key: 'received', label: 'Units received', color: ORANGE },
];

// Overall trend lines: orders/received keep their monthly-chart colours; aqua and violet added (validated set)
const TIMELINE_SERIES: ColumnSeries[] = [
  { key: 'ordered', label: 'Units ordered', color: BLUE },
  { key: 'received', label: 'Units received', color: ORANGE },
  { key: 'influencers', label: 'Influencers reached', color: '#1baf7a' },
  { key: 'products', label: 'Products in play', color: '#6250d6' },
];

const Highlight: React.FC<{ label: string; value: React.ReactNode; note: React.ReactNode }> = ({ label, value, note }) => (
  <div className="card p-5">
    <div className="text-xs font-semibold text-slate-500">{label}</div>
    <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 leading-tight break-words">{value}</div>
    <div className="text-xs text-slate-500 mt-1">{note}</div>
  </div>
);

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Charts and derived numbers for the Overview page. */
export const OverviewInsights: React.FC = () => {
  const { influencers, products, campaigns } = useCrmStore();

  const insights = useMemo(() => {
    const byId = Object.fromEntries(influencers.map(i => [i.id, i]));
    const mine = campaigns.filter(c => byId[c.influencerId]);

    const months = monthlyActivity(mine);
    const busiest = months.reduce((best, m) => (m.orders > (best?.orders ?? -1) ? m : best), months[0]);

    const deliveries = mine.map(c => ({ c, days: deliveryDays(c) })).filter((d): d is { c: typeof d.c; days: number } => d.days !== null);
    const days = deliveries.map(d => d.days);
    const histogram = DELIVERY_BINS.map(b => ({ label: b.label, count: days.filter(d => d >= b.min && d <= b.max).length }));
    const slowest = [...deliveries].sort((a, b) => b.days - a.days)[0];
    const deliveryByProduct = products
      .map(p => ({ product: p, days: deliveries.filter(d => d.c.product === p).map(d => d.days) }))
      .filter(r => r.days.length > 0)
      .map(r => ({ label: r.product, value: average(r.days), detail: `${r.days.length} deliver${r.days.length === 1 ? 'y' : 'ies'}` }))
      .sort((a, b) => b.value - a.value);

    const receivedCount = mine.filter(c => ['received', 'reviewed'].includes(getStage(c))).length;
    const reviewedCount = mine.filter(c => getStage(c) === 'reviewed').length;
    const reviewRates = reviewRateByProduct(products, mine).sort((a, b) => b.rate - a.rate || b.received - a.received);

    const platforms = countBy(mine.filter(c => c.reviewVideoLink), c => reviewPlatform(c.reviewVideoLink!));

    const reviewsByInfluencer = countBy(mine.filter(c => getStage(c) === 'reviewed'), c => c.influencerId);
    const topReviewers = reviewsByInfluencer.slice(0, 8).map(r => ({
      label: byId[r.label].name,
      value: r.value,
      detail: byId[r.label].channelName !== byId[r.label].name ? byId[r.label].channelName : undefined,
      href: `/influencers/${r.label}`,
    }));

    const languages = countBy(influencers, i => i.language || 'Not set').map(l => {
      const ids = new Set(influencers.filter(i => (i.language || 'Not set') === l.label).map(i => i.id));
      const reviews = mine.filter(c => ids.has(c.influencerId) && getStage(c) === 'reviewed').length;
      return { ...l, detail: `${reviews} review${reviews === 1 ? '' : 's'} posted` };
    });
    const deals = countBy(influencers, i => i.barterStatus || 'Not set');

    const completeness = PROFILE_FIELDS.map(f => {
      const filled = influencers.filter(i => String(i[f.key] || '').trim()).length;
      return { label: f.label, value: influencers.length ? filled / influencers.length : 0, display: pct(influencers.length ? filled / influencers.length : 0), detail: `${filled} of ${influencers.length}`, missing: influencers.length - filled };
    }).sort((a, b) => b.value - a.value);
    const leastComplete = [...completeness].sort((a, b) => a.value - b.value)[0];

    // Overall weekly running totals and the takeaways read from them
    const timeline = weeklyTimeline(mine);
    const lastWeek = timeline[timeline.length - 1];
    let peak = { start: 0, orders: 0 };
    timeline.forEach((_, i) => {
      const orders = timeline.slice(i, i + 4).reduce((sum, w) => sum + w.ordersThisWeek, 0);
      if (orders > peak.orders) peak = { start: i, orders };
    });
    const recent = timeline.slice(-4).reduce((sum, w) => sum + w.ordersThisWeek, 0);
    const before = timeline.slice(-8, -4).reduce((sum, w) => sum + w.ordersThisWeek, 0);
    const firstWithOrders = timeline.find(w => w.ordered > 0);

    return {
      timeline, lastWeek, peak, recent, before, firstWithOrders,
      months, busiest, days, histogram, slowest, deliveryByProduct, receivedCount, reviewedCount, reviewRates,
      platforms, topReviewers, languages, deals, completeness, leastComplete, byId,
    };
  }, [influencers, products, campaigns]);

  const {
    timeline, lastWeek, peak, recent, before, firstWithOrders,
    months, busiest, days, histogram, slowest, deliveryByProduct, receivedCount, reviewedCount, reviewRates,
    platforms, topReviewers, languages, deals, completeness, leastComplete, byId,
  } = insights;
  const youtubeShare = platforms.filter(p => p.label.startsWith('YouTube')).reduce((s, p) => s + p.value, 0);
  const totalReviews = platforms.reduce((s, p) => s + p.value, 0);

  return (
    <section aria-labelledby="insights-heading" className="mb-8">
      <h2 id="insights-heading" className="text-base font-bold text-slate-900 mb-1">Insights</h2>
      <p className="text-xs text-slate-500 mb-3">Trends worked out from order, delivery and review dates. Hover a chart for exact numbers.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Highlight
          label="Typical delivery time"
          value={`${median(days)} days`}
          note={`median of ${days.length} deliveries · average ${average(days).toFixed(1)} days`}
        />
        <Highlight
          label="Review rate"
          value={pct(receivedCount ? reviewedCount / receivedCount : 0)}
          note={`${reviewedCount} of ${receivedCount} received units have a review`}
        />
        <Highlight
          label="Busiest month"
          value={busiest ? busiest.label : '—'}
          note={busiest ? `${busiest.orders} orders placed` : 'no dated orders yet'}
        />
        <Highlight
          label="Top reviewer"
          value={topReviewers[0] ? <Link to={topReviewers[0].href} className="hover:text-blue-700">{topReviewers[0].label}</Link> : '—'}
          note={topReviewers[0] ? `${topReviewers[0].value} reviews posted` : 'no reviews yet'}
        />
      </div>

      {lastWeek && (
        <ChartCard
          className="mb-4"
          title="Overall progress over time"
          insight={`Running totals week by week, from the first order (week of ${timeline[0].label}) to the latest (${lastWeek.label} week).`}
          table={{
            columns: ['Week of', ...TIMELINE_SERIES.map(s => s.label), 'In transit'],
            rows: timeline.map(w => [w.label, w.ordered, w.received, w.influencers, w.products, w.inTransit]),
          }}
        >
          <ChartLegend series={TIMELINE_SERIES} mark="line" />
          <LineChart data={timeline} series={TIMELINE_SERIES} tooltipTitle={l => `Week of ${l}`} />
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700 border-t border-slate-100 pt-4">
            <li>
              <strong className="text-slate-900">{lastWeek.ordered} units</strong> ordered for{' '}
              <strong className="text-slate-900">{lastWeek.influencers} of {influencers.length} influencers</strong> across{' '}
              <strong className="text-slate-900">{lastWeek.products} of {products.length} products</strong>.
            </li>
            <li>
              Busiest stretch: the 4 weeks from <strong className="text-slate-900">{timeline[peak.start].label}</strong> brought{' '}
              <strong className="text-slate-900">{peak.orders} orders</strong> ({pct(lastWeek.ordered ? peak.orders / lastWeek.ordered : 0)} of all).
            </li>
            <li>
              <strong className="text-slate-900">{lastWeek.inTransit} unit{lastWeek.inTransit === 1 ? '' : 's'}</strong> ordered but not received yet;{' '}
              <strong className="text-slate-900">{receivedCount - reviewedCount}</strong> received units still need a review
              {' '}({pct(receivedCount ? reviewedCount / receivedCount : 0)} reviewed so far).
            </li>
            <li>
              {recent >= before
                ? <>Momentum is up: <strong className="text-slate-900">{recent} orders</strong> in the last 4 weeks vs {before} in the 4 before.</>
                : <>Momentum slowed: <strong className="text-slate-900">{recent} orders</strong> in the last 4 weeks vs {before} in the 4 before.</>}
              {firstWithOrders && <> Reach grew from {firstWithOrders.influencers} influencer{firstWithOrders.influencers === 1 ? '' : 's'} to {lastWeek.influencers}.</>}
            </li>
          </ul>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard
          title="Orders and deliveries by month"
          insight={busiest ? `${busiest.label} was the busiest month with ${busiest.orders} orders.` : undefined}
          table={{ columns: ['Month', 'Orders placed', 'Units received'], rows: months.map(m => [m.label, m.orders, m.received]) }}
        >
          <ChartLegend series={MONTH_SERIES} />
          <ColumnChart data={months} series={MONTH_SERIES} />
        </ChartCard>

        <ChartCard
          title="How long delivery takes"
          insight={slowest
            ? <>Most units arrive within {median(days)} days. Slowest: {slowest.days} days ({byId[slowest.c.influencerId]?.name}, {slowest.c.product}).</>
            : 'No deliveries with both dates yet.'}
          table={{ columns: ['Delivery time', 'Units'], rows: histogram.map(h => [h.label, h.count]) }}
        >
          <ColumnChart data={histogram} series={[{ key: 'count', label: 'Units', color: BLUE }]} labelValues />
        </ChartCard>

        <ChartCard title="Average delivery time by product" insight="Days from order to receipt, slowest first.">
          <BarList items={deliveryByProduct.map(d => ({ ...d, display: `${d.value.toFixed(1)} d`, href: `/products/${encodeURIComponent(d.label)}` }))} />
        </ChartCard>

        <ChartCard title="Review rate by product" insight="Share of received units that already have a review video.">
          <BarList
            meter
            max={1}
            items={reviewRates.map(r => ({
              label: r.product,
              value: r.rate,
              display: pct(r.rate),
              detail: `${r.reviewed} of ${r.received} reviewed`,
              href: `/products/${encodeURIComponent(r.product)}`,
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Where reviews are posted"
          insight={totalReviews ? `${pct(youtubeShare / totalReviews)} of reviews are on YouTube (videos and Shorts).` : 'No reviews yet.'}
        >
          <BarList items={platforms.map(p => {
            const platform = platformOfLabel(p.label);
            return { ...p, icon: platform ? <PlatformIcon platform={platform} size={14} /> : undefined };
          })} />
        </ChartCard>

        <ChartCard title="Top reviewers" insight="Influencers with the most review videos posted.">
          <BarList items={topReviewers} />
        </ChartCard>

        <ChartCard title="Influencers by language" insight="How many creators work in each language, and the reviews they've posted.">
          <BarList items={languages} />
        </ChartCard>

        <ChartCard
          title="Deal types"
          insight={deals.find(d => d.label === 'Not set')
            ? `${deals.find(d => d.label === 'Not set')!.value} influencers have no deal type yet — set it on their page.`
            : 'Every influencer has a deal type.'}
        >
          <BarList items={deals} />
        </ChartCard>

        <ChartCard
          title="Profile completeness"
          className="xl:col-span-2"
          insight={leastComplete && leastComplete.missing > 0
            ? `${leastComplete.label} is the most often missing: ${leastComplete.missing} influencers don't have it yet.`
            : 'Every profile is complete.'}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
            <BarList meter max={1} items={completeness.slice(0, Math.ceil(completeness.length / 2))} />
            <div className="mt-2.5 lg:mt-0">
              <BarList meter max={1} items={completeness.slice(Math.ceil(completeness.length / 2))} />
            </div>
          </div>
        </ChartCard>
      </div>
    </section>
  );
};
