const { spawn } = require("child_process")
const path = require("path")

const root = path.join(__dirname, "..")
const python = path.join(root, ".venv", "Scripts", "python.exe")

const proc = spawn(python, ["-m", "uvicorn", "backend.main:app", "--port", "8765", "--reload"], {
  cwd: root,
  stdio: "inherit",
})

proc.on("exit", (code) => process.exit(code ?? 0))