OFFLINE MULTI-LANGUAGE TRANSLATION ARCHITECTURE
===============================================

Supported Languages (8):
  - EN: English
  - TE: తెలుగు (Telugu)
  - TA: தமிழ் (Tamil)
  - HI: हिन्दी (Hindi)
  - PT: Português (Portuguese)
  - KO: 한국어 (Korean)
  - FR: Français (French)
  - JA: 日本語 (Japanese)

Removed Languages:
  - Kannada (KN) and Malayalam (ML) have been completely removed.

Key Characteristics:
  1. 100% Local & Offline: Stored in `src/i18n/offlineTranslation.ts` (`src/i18n/onlineTranslation.ts` re-exports it). Zero external translation APIs (`libretranslate` or remote endpoints) are used.
  2. Technical Terminology Protection: All IEC 61850 Logical Nodes (XCBR1, CSWI1, CILO1, MMXU1, PTOC1, PDIS1, PDIF1, PTRC1, RSYN1, ATCC1, LPHD1, LLN0), attributes (`stVal`, `ctlVal`, `stNum`, `sqNum`, `confRev`, `gocbRef`, `datSet`, `RptEna`, `TrgOps`), protocols (`GOOSE`, `MMS`, `PRP`, `HSR`, `IEC 61850`, `IEC 60870-5-104`, `Modbus TCP`, `OPC UA`, `IEEE 1588v2 PTP`), formulas, CLI commands, and device IDs (`BAY-132-L1`, `IED_132_L1`, `TX-T1`, `DT-APT-1`, etc.) remain strictly unchanged across all languages.
  3. Language Persistence: Selected language is persisted in `localStorage` under `sas-display-language` and automatically restored across page reloads and deep-linked workspace routes.
