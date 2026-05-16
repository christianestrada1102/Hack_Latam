export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-neutral-200 mb-1">Overview</h1>
      <p className="text-sm text-neutral-500">Threat landscape — Latin America</p>

      <div className="grid grid-cols-3 gap-3 mt-6">
        {[
          { label: 'Threats detected (24h)', value: '—', mono: true },
          { label: 'Active campaigns',       value: '—', mono: true },
          { label: 'Avg. risk score',        value: '—', mono: true },
        ].map((stat) => (
          <div key={stat.label} className="card-base p-4">
            <p className="text-[11px] text-neutral-500 uppercase tracking-widest mb-2">
              {stat.label}
            </p>
            <p className="text-2xl font-semibold text-amber-400 font-mono">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
