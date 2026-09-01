import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Link from '@mui/material/Link';
import { useTheme } from '@mui/material/styles';
import { useTransactionBuckets } from '../lib/queries';
import { compactMoney, money, type AmountBucket } from '../lib/api';

export interface BucketSelection {
  min: number;
  max: number | null;
}

// Two series with different units (count vs dollars). They're grouped side by
// side but each is scaled to its OWN max — the heights are comparable within a
// series (blue-to-blue, green-to-green) across ranges, not blue-to-green.
const COLORS = {
  count: { light: '#2a78d6', dark: '#3987e5' }, // blue  — number of transactions
  total: { light: '#1baf7a', dark: '#199e70' }, // green — dollar amount
};

const BAR_AREA = 64; // px height of the plot band

/**
 * Distribution of (non-pending, outflow) transactions by amount range, over
 * whatever filters the transaction list is currently using.
 *  - blue bar  = number of transactions in the range
 *  - green bar = total dollars in the range
 * Clicking a column filters the table to that range (the selected column keeps
 * full color, the rest dim).
 */
export function AmountBuckets({
  accountId,
  itemId,
  search,
  days,
  selected,
  onSelect,
}: {
  accountId?: string;
  itemId?: string;
  search?: string;
  days?: number;
  selected: BucketSelection | null;
  onSelect: (bucket: AmountBucket | null) => void;
}) {
  const mode = useTheme().palette.mode;
  const color = (k: keyof typeof COLORS) => COLORS[k][mode];

  const { data, isLoading } = useTransactionBuckets({ accountId, itemId, search, days });
  const buckets = data?.buckets ?? [];
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const maxTotal = Math.max(1, ...buckets.map((b) => b.total));
  const totalCount = buckets.reduce((n, b) => n + b.count, 0);
  const totalAmount = buckets.reduce((n, b) => n + b.total, 0);

  const isSelected = (b: AmountBucket) => selected?.min === b.min && selected?.max === b.max;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="overline" color="text.secondary">
          Transactions by amount
        </Typography>
        {selected && (
          <Link component="button" variant="caption" underline="hover" onClick={() => onSelect(null)}>
            Clear filter
          </Link>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {isLoading ? (
          <Skeleton width={220} />
        ) : (
          <>
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {totalCount.toLocaleString()}
            </Box>{' '}
            transaction{totalCount === 1 ? '' : 's'} ·{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {money(totalAmount)}
            </Box>{' '}
            total
          </>
        )}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
        <LegendSwatch color={color('count')} label="Transactions" />
        <LegendSwatch color={color('total')} label="Total amount" />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'stretch', gap: { xs: 0.5, sm: 1.5 } }}>
        {isLoading &&
          Array.from({ length: 7 }).map((_, i) => (
            <Box key={i} sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Skeleton variant="rounded" width={40} height={BAR_AREA} />
            </Box>
          ))}

        {!isLoading &&
          buckets.map((b) => {
            const active = isSelected(b);
            const dimmed = selected !== null && !active;
            return (
              <Tooltip
                key={b.label}
                arrow
                title={
                  <>
                    {b.count.toLocaleString()} transaction{b.count === 1 ? '' : 's'} · {money(b.total)}{' '}
                    total
                    {b.count > 0 && <> — click to {active ? 'clear' : 'filter'}</>}
                  </>
                }
              >
                <Box
                  component="button"
                  type="button"
                  disabled={b.count === 0}
                  onClick={() => onSelect(active ? null : b)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    border: 0,
                    background: 'none',
                    p: 0,
                    font: 'inherit',
                    cursor: b.count === 0 ? 'default' : 'pointer',
                    borderRadius: 1,
                    '&:hover': b.count > 0 ? { bgcolor: 'action.hover' } : undefined,
                  }}
                >
                  {/* plot band: the two bars, side by side, growing from a shared baseline */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: '3px',
                      height: BAR_AREA,
                      width: '100%',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Bar
                      color={color('count')}
                      pct={(b.count / maxCount) * 100}
                      hasValue={b.count > 0}
                      dimmed={dimmed}
                    />
                    <Bar
                      color={color('total')}
                      pct={(b.total / maxTotal) * 100}
                      hasValue={b.total > 0}
                      dimmed={dimmed}
                    />
                  </Box>

                  <Typography
                    variant="caption"
                    color={dimmed ? 'text.disabled' : 'text.secondary'}
                    align="center"
                    fontWeight={active ? 700 : 400}
                    sx={{ mt: 0.75, lineHeight: 1.2 }}
                  >
                    {b.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    align="center"
                    color={dimmed ? 'text.disabled' : 'text.primary'}
                    sx={{ fontSize: 10, lineHeight: 1.3 }}
                  >
                    {b.count} · {compactMoney(b.total)}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
      </Box>
    </Paper>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: color }} />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function Bar({
  color,
  pct,
  hasValue,
  dimmed,
}: {
  color: string;
  pct: number;
  hasValue: boolean;
  dimmed: boolean;
}) {
  return (
    <Box
      sx={{
        width: 14,
        height: `${Math.max(pct, hasValue ? 3 : 0)}%`,
        bgcolor: dimmed ? 'action.disabledBackground' : color,
        borderRadius: '3px 3px 0 0',
        transition: 'height 0.2s ease, background-color 0.15s ease',
      }}
    />
  );
}
