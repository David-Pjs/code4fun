import { motion } from "framer-motion";
import { useState } from "react";
import DeviceSelector from "./DeviceSelector";
import type { Project } from "../types/project";

interface Props {
  project: Project;
}

export default function PreviewFrame({ project }: Props) {
  const [device, setDevice] = useState("100%");

  const srcDoc = `
  <html><head><style>${project.css}</style></head>
  <body>${project.html}
  <script>${project.js}</script></body></html>`;

  const deviceWidth =
    device === "100%" ? "100%" : `${device}px`;

  return (
    <div className="flex flex-col bg-panel rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-sm text-gray-400">Preview</span>
        <DeviceSelector current={device} onChange={setDevice} />
      </div>
      <motion.div
        key={device}
        animate={{ width: deviceWidth }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="mx-auto bg-white shadow-xl rounded-md overflow-hidden my-2"
      >
        <iframe
          title="preview"
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-[400px] rounded-md"
        />
      </motion.div>
    </div>
  );
}
