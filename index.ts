import cproc from "child_process"
import fsp from "fs/promises"
import fs from "fs"
import path from "path"

// lazy argument parsing
const target = process.argv
	.slice(2)
	.filter((x) => !x.startsWith("--"))
	.join(" ")

const args = process.argv.filter((x) => x.startsWith("--"))

if (args.includes("--help") || !target) {
	console.error("usage: bulkrename [--verbose] [--dry-run] [--no-create] [--no-edit] <path to dir>")
	process.exit(1)
}

const dryRun = args.includes("--dry-run")
const verbose = args.includes("--verbose")
const noCreate = args.includes("--no-create")
const noEdit = args.includes("--no-edit")

async function walk(dirPath: string, depth = 0) {
	// [absPath, isDir, relPath, depth]
	const found: [string, boolean, string, number][] = []
	const dirContents = await fsp.readdir(dirPath)
	for (const filePath of dirContents) {
		const absPath = path.join(dirPath, filePath)
		const stat = await fsp.stat(absPath)
		if (stat.isDirectory()) {
			found.push([absPath, true, filePath, depth])
			found.push(...(await walk(absPath, depth + 1)))
		} else {
			found.push([absPath, false, filePath, depth])
		}
	}
	return found
}

if (verbose) console.log("target:", target)

const contents = await walk(target)
const output = []
for (const [absPath, isDir, relPath, depth] of contents) {
	output.push("\t".repeat(depth) + relPath)
}

if (!noCreate) await fsp.writeFile("/tmp/bulkrename", output.join("\n"))
if (verbose) console.log("editor:", process.env.EDITOR)
if (!noEdit) cproc.execSync(`${process.env.EDITOR ?? "nano"} /tmp/bulkrename`)
if (verbose) console.log("editor exited...")

// then we diff
const newInput = (await fsp.readFile("/tmp/bulkrename", "utf8")).split("\n")
if (newInput.length !== output.length) {
	throw new Error("Number of lines back from editor differs to the original number of lines. You are not supposed to remove/rearrange lines.")
}
for (let i = newInput.length - 1; i >= 0; i--) {
	const line = newInput[i]
	if (line !== output[i]) {
		const [absPath, isDir, relPath, depth] = contents[i]
		// console.log("line", i, "differs", contents[i], "->", line)
		const trimmedRelPath = line.trim()

		if (!trimmedRelPath) {
			if (dryRun) {
				console.log("will delete", `"${absPath}"`)
			} else {
				await fsp.rm(absPath, {force: true, recursive: true})
				if (verbose) {
					console.log(`removed "${absPath}"`)
				}
			}
		} else {
			// count number of tabs at start of line
			let tabDepth = 0
			for (let char of line)
				if (char === "\t") tabDepth++
				else break

			const newDepth = depth - tabDepth + 1
			if (newDepth < 1) {
				throw new Error("invalid indentation")
			}
			const dest = path.join(absPath, "../".repeat(newDepth), trimmedRelPath)
			if (dryRun) {
				console.log("will rename", `"${absPath}"`, "to", `"${dest}"`)
			} else {
				await fsp.rename(absPath, dest)
				if (verbose) {
					console.log(`"${absPath}"`, "->", `"${dest}"`)
				}
			}
		}
	}
}
