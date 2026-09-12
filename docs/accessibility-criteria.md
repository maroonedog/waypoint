# WCAG 2.2 A and AA, criterion by criterion

Every Level A and Level AA success criterion in WCAG 2.2, with one verdict each about `@maroonedog/waypoint`. Fifty-five rows. The interesting ones are the refusals.

**No row says "discharges", and that is the most important sentence here.** This library renders nothing. It hands back prop bags — `inputProps`, `labelProps`, `descriptionProps`, `errorProps` — and an application spreads them onto markup it wrote itself. A library in that position cannot discharge a success criterion, because the artefact a criterion is evaluated against is the rendered document, and this package is never the last hand on it. The most it can do is make the correct attributes the default and the incorrect ones impossible to derive. So the verdicts are:

| verdict | means |
|---|---|
| **Helps** | the library produces a part the criterion needs. The application still has to render it, and if it does not, the criterion fails. |
| **Does not** | a field-level obligation this library leaves entirely to the caller. The reason is given. These are the gaps. |
| **Cannot touch** | a property of the page, the flow, the prose or the pixels. No field-level library reaches it, and saying otherwise would be a sales sentence. |

**What is checked and what is asserted.** `test/accessibility-axe.test.mjs` runs axe-core 4.13.0 over four rendered forms — every `FormFieldKind`; a closed field, a described field and a field carrying an error together; a list of rows; the error summary — and fails the build on any violation. `config/axe-coverage.json` records which rules reached a verdict and which two were switched off because jsdom cannot run them.

A row is marked *(axe)* when a rule in that recorded `decided` list carries that criterion in **axe's own WCAG tag** — `axe.getRules()`, tag `wcag131`, `wcag332`, `wcag412`. Exactly three criteria qualify, and that is the whole of what is measured here: 1.3.1 (`list`, `listitem`), 3.3.2 (`form-field-multiple-labels`), and 4.1.2 (the other thirteen, `label` and `select-name` and the `aria-*` family among them). The audit is scoped to the mounted subtree, so no rule about the page itself — `html-has-lang`, `document-title`, `region` — reaches it at all. Everything else in this table is a reading of the source, not a measurement. **Nothing here has met a screen reader or an auditor.**

## The legal frame, stated once and precisely

Directive (EU) 2019/882 — the European Accessibility Act — applies to products placed on the market and services provided to consumers **after 28 June 2025** (Article 2). That date has passed.

What it does *not* mean: that EN 301 549 gives you a presumption of conformity with it. Article 15(1) of the EAA makes that presumption conditional on the standard's references being published in the *Official Journal of the European Union* for **this** Directive, and no harmonised standard has been so cited under the EAA. EN 301 549 is cited in the Official Journal under Directive (EU) 2016/2102, the Web Accessibility Directive, by Commission Implementing Decision (EU) 2018/2048 as amended by (EU) 2021/1339 — a different instrument. The version cited there is **V3.2.1**, whose clause 9 requires WCAG 2.1 Level A and AA.

**EN 301 549 V4.1.1 was published by ETSI on 2 September 2026** and references WCAG 2.2 AA, adding an Annex ZB that maps the standard onto the EAA's essential requirements. It **does not move the harmonised baseline**, because it has not been cited in the Official Journal. Anyone telling you the enforceable European baseline is WCAG 2.2 today is ahead of the paperwork.

The practical consequence for a form: the criteria that bite — 1.3.1, 3.3.1, 3.3.2, 3.3.3, 4.1.2, 4.1.3 — are all WCAG 2.1 criteria, present in V3.2.1, and none of them is new in 2.2. The table below is mapped against 2.2 anyway, because that is where the standard is going. 2.2 adds six A and AA criteria — 2.4.11 Focus Not Obscured (AA), 2.5.7 Dragging Movements (AA), 2.5.8 Target Size (AA), 3.2.6 Consistent Help (A), 3.3.7 Redundant Entry (A) and 3.3.8 Accessible Authentication, Minimum (AA) — and the table says which of them this library discharges, which it only helps with, and which it cannot touch because they are properties of a flow rather than of a field.

*Sources, all read on 2026-09-12: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for every criterion number, name and level; [Understanding SC 3.3.3](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html) and [Understanding SC 3.2.5](https://www.w3.org/WAI/WCAG22/Understanding/change-on-request.html) where a level needed confirming; [Directive (EU) 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng); ETSI's [EN 301 549 V4.1.1 (2026-09)](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf).*

## The six that actually bite a form

### 1.3.1 Info and Relationships (A) — **Helps** *(axe)*

> "Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text."

This is the criterion most of the prop bags exist for, and the one they cover most completely. `labelProps.htmlFor` is `inputProps.id`; `descriptionProps.id` and `errorProps.id` are the two ids `aria-describedby` names, in that order — what the field wants, then what is wrong with what it was given. `required` comes off `descriptor.isRequired`. The ids are scoped by `useId()`, so two forms on one page cannot collide, which is the failure mode that makes `htmlFor` point at the wrong element.

**What it does not do: grouping.** A set of radios, or an address block, needs `<fieldset><legend>` for its relationship to be programmatically determinable. `AutoForm` draws a container as `<div data-field-group="…">`, not a fieldset, and it will not start: a fieldset carries a legend, a legend carries prose, and prose is the thing the descriptor refuses to invent. A caller with a radio group writes the fieldset.

`descriptionProps` is `undefined` when the schema declared no description, so no `aria-describedby` ever points at an element nobody drew — an attribute naming a missing id is worse than no attribute, because a reader is told there is more and then hears nothing.

### 3.3.1 Error Identification (A) — **Helps**

> "If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text."

Two halves, and the library carries one and a bit. The *identification* is `aria-invalid` — emitted **only** on a field that actually carries issues, never as `aria-invalid={false}` on forty untouched inputs — plus `aria-describedby` pointing at the message element, plus, since this change, `useErrorSummary()`, which names every blocked field in one list a reader meets first.

The *description in text* is the validator's message, passed through unaltered. This library does not write error prose and cannot judge it: zod 4.6.1's default for an empty required string is `Too small: expected string to have >=1 characters`, which is text and does describe the error, and is also not a sentence anybody should show a person. The contract carries `FormIssue.message` and the vendor owns it.

One measured trap worth writing down. `inputProps.required` is a real `required` attribute, so the browser's own constraint validation runs first: a `<form>` without `noValidate` never fires `submit` for an empty required field, and `form.submit()` is never reached. That is fine — the native bubble is itself an error identification — but a caller doing its own messaging must set `noValidate`, or its summary will never appear. Found by writing the focus tests now in `test/error-summary-react.test.mjs`, where the first version of every one of them failed for exactly this reason.

### 3.3.2 Labels or Instructions (A) — **Helps** *(axe)*

> Labels or instructions are provided when content requires user input.

`descriptor.label` and `descriptor.description` are **quoted** from the schema — a zod `.meta({ title })`, a JSON Schema `title`/`description` — or absent. Nothing is derived from the path, and the refusal is deliberate: turning `owner.name` into "Owner name" decides casing, wording and language, and language is the one decision an application cannot delegate. So a schema that declares no title produces a field with no label, and the library says so rather than filling in. The criterion then fails, visibly, at the caller's markup — which is where it can be fixed.

The error summary makes the same refusal. `ErrorSummaryEntry.label` is `string | undefined`, not the path as a fallback, because `items[0].sku` in a list headed "There is a problem" is worse than nothing.

### 3.3.3 Error Suggestion (AA) — **Cannot touch**

> "If an input error is automatically detected and suggestions for correction are known, then the suggestions are provided to the user, unless it would jeopardize the security or purpose of the content."

Nothing in this package knows a suggestion. `FormIssue` is `path`, `message`, an optional `code` and an optional `severity`; there is no member meaning "try this instead", and adding one would be adding to the contract's smallest type on behalf of a validator that has nothing to put in it. The constraints a descriptor carries — `minimum`, `maximum`, `minLength`, `maxLength`, `step`, `pattern`, `format` — reach the element as native attributes, which is where a browser's own suggestion comes from, and that is the whole of the contribution. Whether "Enter a postcode like SW1A 1AA" appears is the application's, via the validator's message.

### 4.1.2 Name, Role, Value (A) — **Helps** *(axe)*

> For all user interface components, the name and role can be programmatically determined; states, properties and values can be set by the user and programmatically determined.

**Role** is carried entirely, by not being carried: every control the bags describe is a native element — `inputProps.type` is `number`, `checkbox`, `date`/`datetime-local`/`time`, `email`/`url`/`text`, `file`, or absent for a closed field so that the caller's `<select>` is not given an invalid attribute. The library ships no custom widget with a role to get wrong, and `resolveWidget` looks up the caller's.

**Name** is the `<label>` the caller renders with `labelProps`. **Value** is the cell, controlled — except for `kind: "file"`, where the branch emits neither `value` nor `checked` because a file input cannot be controlled at all, and the node is the only holder of what was picked.

`aria-required` is deliberately absent. `required` is on the element and a native control maps it to the same thing an assistive technology reads; the second copy is the one that goes stale. That is a judgement, not a measurement, and a reader who disagrees can add it.

### 4.1.3 Status Messages (AA) — **Helps, with a caveat the source already carries**

> Status messages can be programmatically determined through role or properties and presented by assistive technologies without receiving focus.

`errorProps` is `{ id, role: "alert" }`. Two things about it are stated in `field-element-ids.ts` and are repeated here because they are the difference between the attribute working and the attribute being decoration:

1. `role="alert"` is an **assertive** live region. It is right for a message about the field the reader is in, and wrong for a form that re-judges on every keystroke — which is why `validateOn: "blur"` exists and why this is a bag the caller spreads rather than markup the library writes.
2. A live region announces reliably only when the element was already in the document and its **text** changed. Several screen readers miss a region inserted together with its first message. A caller that wants the announcement renders the message element always and lets it be empty — which a reserved-height message line does anyway, to stop the form reflowing.

`useErrorSummary`'s `summaryProps` deliberately carries **no** role, only `tabIndex: -1`. GOV.UK does both — an inner `role="alert"` and JavaScript that moves focus to the component — and doing both from a library would announce twice for a caller who then focuses it. The summary is usually not in the document at all until a submit is refused, which is exactly the case caveat 2 says a live region handles badly. So the library supplies the means to focus it and leaves the role to a caller who has decided to render it always.

## The full table

### Principle 1 — Perceivable

| SC | Name | Level | Verdict | Why |
|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | Cannot touch | No image, icon or asterisk is emitted. A required-field marker is the caller's markup. |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | Cannot touch | No media. |
| 1.2.2 | Captions (Prerecorded) | A | Cannot touch | No media. |
| 1.2.3 | Audio Description or Media Alternative | A | Cannot touch | No media. |
| 1.2.4 | Captions (Live) | AA | Cannot touch | No media. |
| 1.2.5 | Audio Description (Prerecorded) | AA | Cannot touch | No media. |
| 1.3.1 | Info and Relationships | A | **Helps** *(axe)* | See above. Grouping is the stated gap. |
| 1.3.2 | Meaningful Sequence | A | Cannot touch | Reading order is the caller's DOM. `AutoForm` draws in declaration order and `useErrorSummary` lists in the same order, which makes the two agree — but the order itself is the vendor's, and no library can know whether it is meaningful. |
| 1.3.3 | Sensory Characteristics | A | Cannot touch | A matter of wording: "the box on the right". The library writes no prose. |
| 1.3.4 | Orientation | AA | Cannot touch | CSS. |
| 1.3.5 | Identify Input Purpose | AA | **Does not** | No `autocomplete` attribute is emitted, anywhere. `FormFieldConstraints` has seven members — `minimum`, `maximum`, `minLength`, `maxLength`, `step`, `pattern`, `format` — and none of them means "this collects the person's given name". Neither zod nor JSON Schema has a keyword for WCAG's input-purpose list, so there is nothing to derive it from; inventing a member for it is a change to the contract and has not been made. A caller spells `autoComplete` on the element. **This is the one AA criterion a field-level library could plausibly own, and this one does not.** |
| 1.4.1 | Use of Color | A | **Helps** | The error state is carried by `aria-invalid` and by a text message, so colour is not the only means — provided the caller renders the message element. The library emits no colour at all. |
| 1.4.2 | Audio Control | A | Cannot touch | No audio. |
| 1.4.3 | Contrast (Minimum) | AA | Cannot touch | Pixels. Also the first of the two axe rules switched off: jsdom paints nothing, so `color-contrast` is recorded in `config/axe-coverage.json` as not run here. |
| 1.4.4 | Resize Text | AA | Cannot touch | CSS. |
| 1.4.5 | Images of Text | AA | Cannot touch | No images. |
| 1.4.10 | Reflow | AA | Cannot touch | CSS. |
| 1.4.11 | Non-text Contrast | AA | Cannot touch | Pixels. |
| 1.4.12 | Text Spacing | AA | Cannot touch | CSS. |
| 1.4.13 | Content on Hover or Focus | AA | Cannot touch | No hover or focus content is produced. `descriptionProps` is a persistent help line, not a tooltip, which is why it does not engage this criterion at all. |

### Principle 2 — Operable

| SC | Name | Level | Verdict | Why |
|---|---|---|---|---|
| 2.1.1 | Keyboard | A | **Helps** | Every control the bags describe is a native `<input>` or the caller's `<select>`, keyboard-operable without any work. No custom widget ships here, so there is none to break it. axe's `nested-interactive` does decide on the rendered forms, but axe tags that rule `wcag412`, so it backs 4.1.2 and not this criterion. |
| 2.1.2 | No Keyboard Trap | A | Cannot touch | Nothing here holds focus. `focusFirst()` and `focusSummary()` move it once, on demand, and never take it back. |
| 2.1.4 | Character Key Shortcuts | A | Cannot touch | No keyboard shortcut is registered. |
| 2.2.1 | Timing Adjustable | A | Cannot touch | No time limit. `validateOn` and the validation scheduler decide *when a pass runs*, never how long a person has. |
| 2.2.2 | Pause, Stop, Hide | A | Cannot touch | Nothing moves, blinks or auto-updates. |
| 2.3.1 | Three Flashes or Below Threshold | A | Cannot touch | Nothing flashes. |
| 2.4.1 | Bypass Blocks | A | Cannot touch | A page-level concern. |
| 2.4.2 | Page Titled | A | Cannot touch | A page-level concern. |
| 2.4.3 | Focus Order | A | **Helps** | `useErrorSummary` is the whole of the contribution: `focusFirst()` moves focus to the first *drawn* field that blocked — skipping a blocked path nothing renders, rather than stopping there with no explanation — and each entry's `focus()` moves it to that entry's field. `summaryProps.tabIndex: -1` keeps the summary out of the tab sequence while letting script focus it. The tab order of the form itself is DOM order, the caller's. |
| 2.4.4 | Link Purpose (In Context) | A | **Helps** | The summary hands back `label` and `message`, which is the text an entry carries. It hands back no `href` — see the refusal below — so an entry is a button, and `button-name` is what axe decides on it. |
| 2.4.5 | Multiple Ways | AA | Cannot touch | A site-level concern. |
| 2.4.6 | Headings and Labels | AA | **Helps** | `descriptor.label` is quoted from the schema or absent; nothing is derived from a path. No heading is emitted anywhere, including above the error summary — "There is a problem" is the caller's `<h2>` in every example here. |
| 2.4.7 | Focus Visible | AA | Cannot touch | CSS. The library never calls `blur()` and never sets an outline. |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | **Does not** | New in 2.2, and it is `focusFirst()`'s problem specifically. Moving focus to a control that sits under a sticky header leaves it obscured, and this package cannot know the header is there: it calls `element.focus()` and nothing else — no `scrollIntoView`, no offset. A caller with fixed chrome has to scroll the focused control clear itself. Stated rather than papered over, because a focus-management feature that quietly parks people behind a banner is worse than one that does not move focus at all. |
| 2.5.1 | Pointer Gestures | A | Cannot touch | No gesture is implemented. |
| 2.5.2 | Pointer Cancellation | A | Cannot touch | No pointer handler is emitted; `onChange` and `onBlur` are the only two. |
| 2.5.3 | Label in Name | A | **Helps** | The accessible name comes from the `<label>` the caller renders with `labelProps`, and the visible text is that same element's text, so the two agree by construction when there is one element. The library cannot stop a caller adding an `aria-label` that says something else. |
| 2.5.4 | Motion Actuation | A | Cannot touch | No motion is read. |
| 2.5.7 | Dragging Movements | AA | **Helps** | New in 2.2. `rows()` exposes `move(from, to)` as a plain call, indifferent to what triggered it — so a list that offers drag-to-reorder can offer two buttons calling the same function, which is the single-pointer alternative the criterion asks for. The library ships neither the drag nor the buttons. |
| 2.5.8 | Target Size (Minimum) | AA | Cannot touch | CSS. The second axe rule switched off, and the more instructive one: left enabled, `target-size` reports a **pass** for a button styled 2px by 2px, because jsdom's `getBoundingClientRect()` returns all zeros. Measured, and recorded in `config/axe-coverage.json` so that a green run is not read as covering it. |

### Principle 3 — Understandable

| SC | Name | Level | Verdict | Why |
|---|---|---|---|---|
| 3.1.1 | Language of Page | A | Cannot touch | A page-level concern. |
| 3.1.2 | Language of Parts | AA | Cannot touch | The library emits no prose of its own, so there is no part of a different language for it to mark. A schema whose `title` is in a second language is a case only the caller can see. |
| 3.2.1 | On Focus | A | Cannot touch | Focusing a field changes nothing. `markTouched()` is on blur, not focus. |
| 3.2.2 | On Input | A | **Helps** | Typing writes a cell and asks for a validation pass. It never submits, never navigates and never moves focus — the only thing in this package that moves focus is `useErrorSummary`, and only when the caller calls it. So the library does not itself cause a change of context on input, which is the whole of what a field-level library can offer here. |
| 3.2.3 | Consistent Navigation | AA | Cannot touch | A site-level concern. |
| 3.2.4 | Consistent Identification | AA | Cannot touch | A site-level concern — though a form drawn by `AutoForm` from one registry is consistent by construction, which is a side effect and not a claim. |
| 3.2.6 | Consistent Help | A | Cannot touch | New in 2.2. A site-level concern: where the help link lives on every page. |
| 3.3.1 | Error Identification | A | **Helps** | See above. |
| 3.3.2 | Labels or Instructions | A | **Helps** *(axe)* | See above. |
| 3.3.3 | Error Suggestion | AA | Cannot touch | See above. `FormIssue` has no member for a suggestion. |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | **Does not** | Reversible, checked or confirmed — a review step, an "are you sure", an undo. Every one of those is a property of the flow between screens, and this package has one screen's worth of state and a `submit()`. `adoptIssues` is the nearest thing: a server's verdict comes back as blocking issues that refuse the next submit, which is error *correction* after the fact rather than prevention before it. |
| 3.3.7 | Redundant Entry | A | **Helps** | New in 2.2. `defaultValues` seeds the root, and `reset(next)` replaces it, so re-showing what a person already gave is a one-line call rather than a feature. Whether the application actually carries an answer forward from the previous step is the application's. |
| 3.3.8 | Accessible Authentication (Minimum) | AA | Cannot touch | New in 2.2. No cognitive function test is imposed here, and the criterion is about what the authentication flow demands. |

### Principle 4 — Robust

| SC | Name | Level | Verdict | Why |
|---|---|---|---|---|
| 4.1.2 | Name, Role, Value | A | **Helps** *(axe)* | See above. |
| 4.1.3 | Status Messages | AA | **Helps** | See above, with both caveats. |

*(WCAG 2.2 removed 4.1.1 Parsing, so there is no row for it.)*

## What this table is not

It is not an audit. An audit is performed by a person against a rendered application, and this is a reading of a library against a standard, with a machine check over four synthetic forms. Three of the fifty-five rows are backed by a running assertion; the rest are argued. Two axe rules are switched off with reasons recorded. The one thing it does have over the alternative is that every row can be disagreed with specifically.

**Still not done, still not scheduled:** an audit by somebody who does this for a living, and a screen reader — any screen reader — in front of any of it. Until then the strongest claim available is the one made at the top: no row says "discharges".
