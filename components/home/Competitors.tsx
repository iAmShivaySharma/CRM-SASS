import { Check, X, Minus } from 'lucide-react'

const competitors = [
  { name: 'CRM Pro', price: '$29/mo', you: true },
  { name: 'HubSpot', price: '$800+/mo' },
  { name: 'Salesforce', price: '$75/user' },
  { name: 'Monday', price: '$16/seat' },
  { name: 'Zoho', price: '$52/user' },
]

const features: [string, boolean[]][] = [
  ['Sales CRM & Pipeline',       [true, true, true, false, true]],
  ['AI Lead Scoring',            [true, true, true, false, false]],
  ['AI Email Writer',            [true, false, false, false, false]],
  ['Project Management',         [true, false, false, true, false]],
  ['Time Tracking',              [true, false, false, true, false]],
  ['Team Chat',                  [true, false, false, false, false]],
  ['Email Integration',          [true, true, true, false, true]],
  ['HR & Attendance',            [true, false, false, false, false]],
  ['Leave Management',           [true, false, false, false, false]],
  ['Asset Tracking (QR)',        [true, false, false, false, false]],
  ['Workflow Automation',        [true, true, true, false, true]],
  ['Self-Hostable',              [true, false, false, false, false]],
  ['Per-workspace pricing',      [true, false, false, false, false]],
]

export default function Competitors() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
      <div className="mx-auto mb-14 max-w-xl text-center">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-primary">
          Why switch
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          More features. Less cost. No contest.
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          See how CRM Pro stacks up against tools that only do <em>one</em> thing.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-5 py-4 text-[13px] font-semibold text-muted-foreground">Feature</th>
              {competitors.map(c => (
                <th key={c.name} className={`px-4 py-4 text-center text-[13px] font-semibold ${c.you ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  <div>{c.name}</div>
                  <div className={`mt-0.5 font-mono text-[11px] font-bold ${c.you ? 'text-primary' : 'text-muted-foreground/70'}`}>
                    {c.price}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map(([name, vals], ri) => (
              <tr key={name} className={`border-b border-border/50 ${ri % 2 === 0 ? '' : 'bg-muted/40'}`}>
                <td className="px-5 py-3 text-[13px] font-medium text-foreground/80">{name}</td>
                {vals.map((v, ci) => (
                  <td key={ci} className={`px-4 py-3 text-center ${ci === 0 ? 'bg-primary/5' : ''}`}>
                    {v ? (
                      <Check className={`mx-auto h-4 w-4 ${ci === 0 ? 'text-primary' : 'text-emerald-500'}`} />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-neutral-300" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* positioning statement */}
      <div className="mt-8 rounded-xl bg-muted p-6 text-center">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground/80">Your position:</strong>{' '}
          Powerful + Affordable — the underserved quadrant.
          HubSpot and Salesforce are powerful but expensive.
          Folk and Pipedrive are simple but limited.
          CRM Pro is <strong className="text-primary">both powerful and affordable</strong>.
        </p>
      </div>
    </section>
  )
}
