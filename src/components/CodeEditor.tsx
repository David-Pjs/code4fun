interface Props {
  language: string;
  value: string;
  onChange: (v: string) => void;
}

export default function CodeEditor({ language, value, onChange }: Props) {
  return (
    <textarea
      spellCheck={false}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-full bg-[#0a0f1c] text-gray-200 p-3 font-mono text-sm outline-none resize-none focus:ring-2 focus:ring-accent transition"
      placeholder={`Write your ${language.toUpperCase()} code here...`}
    />
  );
}
