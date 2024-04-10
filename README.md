# bulkrename

simple tool for renaming files. the idea is that the directory you pass to the CLI program will be opened in your editor (e.g. vscode)

the line numbers must be kept consistent, you have the following operations available:

- delete a file by replacing the line with an empty line
- rename a file by changing its name
- move a file up a directory by removing its leading tab

you can set your editor with the `EDITOR` environment variable

(make sure your editor isn't automatically appending trailing newlines to files)

## usage:

1. clone the repo
2. run `pnpm i`
3. run `./bulkrename --dry-run <directory>` to test it out
3. run `./bulkrename <directory>` when ready to run for real!