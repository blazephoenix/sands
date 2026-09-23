"use client"

/**
 * The Hidden text style: the Writer never states Hidden text; the Player must
 * earn it through play. Rendered muted with a dashed underline (tokens only).
 */
import { createReactStyleSpec } from "@blocknote/react"

import { hiddenStyleConfig } from "../schema-config"

export const HIDDEN_TOOLTIP = "Hidden: the Writer never states this"

export const hiddenStyleSpec = createReactStyleSpec(hiddenStyleConfig, {
  render: (props) => <span ref={props.contentRef} className="sands-hidden" data-hidden="" title={HIDDEN_TOOLTIP} />,
})
