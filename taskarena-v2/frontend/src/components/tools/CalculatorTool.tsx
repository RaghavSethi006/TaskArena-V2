import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

const BUTTONS = [
  ["sin(", "cos(", "tan(", "log(", "ln("],
  ["sqrt(", "^", "(", ")", "pi"],
  ["7", "8", "9", "*", "/"],
  ["4", "5", "6", "+", "-"],
  ["1", "2", "3", ".", "="],
  ["0", "e", "back", "C"],
]

function evaluateExpression(rawExpression: string): number {
  const sanitized = rawExpression
    .replace(/\^/g, "**")
    .replace(/pi/g, "Math.PI")
    .replace(/sin\(/g, "Math.sin(")
    .replace(/cos\(/g, "Math.cos(")
    .replace(/tan\(/g, "Math.tan(")
    .replace(/log\(/g, "Math.log10(")
    .replace(/ln\(/g, "Math.log(")
    .replace(/sqrt\(/g, "Math.sqrt(")

  const result = Function(`"use strict"; return (${sanitized});`)() as number
  if (!Number.isFinite(result)) throw new Error("Invalid expression")
  return result
}

export default function CalculatorTool() {
  const [expression, setExpression] = useState("")
  const [result, setResult] = useState("0")

  const displayExpression = useMemo(() => expression || "0", [expression])

  const onPress = (value: string) => {
    if (value === "C") {
      setExpression("")
      setResult("0")
      return
    }

    if (value === "back") {
      setExpression((prev) => prev.slice(0, -1))
      return
    }

    if (value === "=") {
      try {
        const next = evaluateExpression(expression)
        setResult(next.toString())
        setExpression(next.toString())
      } catch {
        setResult("Error")
      }
      return
    }

    setExpression((prev) => `${prev}${value}`)
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[10px] border border-b1 bg-s2/60 p-2">
        <div className="text-[10px] text-tx3 font-mono truncate">{displayExpression}</div>
        <div className="text-right text-[20px] text-tx font-mono font-semibold truncate">{result}</div>
      </div>

      <div className="space-y-1.5">
        {BUTTONS.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className={cn("grid gap-1.5", rowIndex === 5 ? "grid-cols-4" : "grid-cols-5")}>
            {row.map((key) => {
              const isFunction = ["sin(", "cos(", "tan(", "log(", "ln(", "sqrt(", "^", "(", ")", "pi", "e"].includes(key)
              const isOperator = ["*", "/", "+", "-"].includes(key)
              const isEquals = key === "="
              const isDanger = key === "C" || key === "back"

              return (
                <button
                  key={key}
                  onClick={() => onPress(key)}
                  className={cn(
                    "h-8 rounded-[7px] text-[11px] font-medium transition-colors duration-[120ms] border",
                    "border-b1 bg-s2 text-tx2 hover:bg-s3 hover:text-tx",
                    isFunction && "text-blue-300 bg-blue-500/10 border-blue-500/20",
                    isOperator && "text-amber-300 bg-amber-500/10 border-amber-500/20",
                    isEquals && "text-white bg-blue-500 border-blue-500 hover:bg-blue-600",
                    isDanger && "text-rose-300"
                  )}
                  type="button"
                >
                  {key}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
