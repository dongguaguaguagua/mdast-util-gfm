import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'tape'
import {slug} from 'github-slugger'
import {toHast} from 'mdast-util-to-hast'
import {toHtml} from 'hast-util-to-html'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {toMarkdown} from 'mdast-util-to-markdown'
import {gfm} from 'micromark-extension-gfm'
import {gfmFromMarkdown, gfmToMarkdown} from '../index.js'
import {spec} from './spec.js'

test('markdown -> mdast', async (t) => {
  const files = spec.filter(
    (example) => !/disallowed raw html/i.test(example.category)
  )
  let index = -1

  while (++index < files.length) {
    const example = files[index]
    const name = index + '-' + slug(example.category)
    const mdast = fromMarkdown(example.input, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()]
    })

    const hast = toHast(mdast, {allowDangerousHtml: true})
    assert(hast, 'expected node')
    const actualHtml = toHtml(hast, {
      allowDangerousHtml: true,
      entities: {useNamedReferences: true},
      closeSelfClosing: true
    })

    /** @type {string} */
    let expectedHtml
    /** @type {string} */
    let expectedMarkdown
    const expectedUrl = new URL(name + '.html', import.meta.url)
    const inputUrl = new URL(name + '.md', import.meta.url)

    try {
      expectedHtml = String(await fs.readFile(expectedUrl))
    } catch {
      expectedHtml = example.output.slice(0, -1)
    }

    const actualMarkdown = toMarkdown(mdast, {extensions: [gfmToMarkdown()]})

    try {
      expectedMarkdown = String(await fs.readFile(inputUrl))
    } catch {
      expectedMarkdown = actualMarkdown
      await fs.writeFile(inputUrl, expectedMarkdown)
    }

    t.deepEqual(
      actualHtml,
      expectedHtml,
      example.category + ' (' + index + ') -> html'
    )
    t.equal(
      actualMarkdown,
      expectedMarkdown,
      example.category + ' (' + index + ') -> md'
    )
  }

  t.end()
})
