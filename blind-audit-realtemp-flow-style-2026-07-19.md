# Blind Audit — RealTemp Flow + Style

Date: 2026-07-19

## Premortem

If this pass fails, the likely cause is not the colors. It is that RealTemp keeps adding useful weather modules to existing tabs until every section becomes a scroll page again.

## Inversion

To make the app worse, put radar, shade, forecast, settings, alerts, and body profile into one long dashboard. The opposite action is to separate by user intent: current reading, time forecast, maps, and personal tuning.

## Bias Check

The tempting shortcut is a full visual redesign because the neo-brutal style is visibly disliked. The safer product move is narrower: add selectable styles and reduce screen length first, then judge the new default on an actual iPhone.

## Survivorship Check

Current feedback is from an active builder-user, not a broad user base. Do not infer that extra style options matter more than weather trust or speed for future users.

## Recommendation

Ship the smallest structural change now: Forecast becomes time-only, Maps becomes location-visual, Settings owns appearance. Keep formula and data behavior unchanged.
