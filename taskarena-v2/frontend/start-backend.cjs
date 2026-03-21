const { spawn } = require("child_process")
const path = require("path")

const root = path.join(__dirname, "..")
const python = path.join(root, ".venv", "Scripts", "python.exe")
const reloadDirs = [path.join(root, "backend"), path.join(root, "shared")]

const args = [
  "-m",
  "uvicorn",
  "backend.main:app",
  "--port",
  "8765",
  "--reload",
  ...reloadDirs.flatMap((dir) => ["--reload-dir", dir]),
]

const proc = spawn(python, args, {
  cwd: root,
  stdio: "inherit",
})

proc.on("exit", (code) => process.exit(code ?? 0))
