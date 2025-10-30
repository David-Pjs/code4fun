
interface Props {
  current: string;
  onChange: (v: string) => void;
}

export default function DeviceSelector({ current, onChange }: Props) {
  const devices = [
    { name: "Responsive", value: "100%" },
    { name: "Phone", value: "375" },
    { name: "Tablet", value: "500" },
  ];

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#0b1220] text-gray-200 border border-gray-700 text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label="Device selector"
    >
      {devices.map((d) => (
        <option key={d.value} value={d.value}>
          {d.name}
        </option>
      ))}
    </select>
  );
}
