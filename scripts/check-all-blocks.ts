import { BlockRenderer } from '../src/components/assembly/BlockRenderer'

// Just confirm the module loads — BlockRenderer is a React component, we
// can't really exercise it without a render tree, but we CAN confirm the
// imports resolve. The `void` keeps the import live for the lint pass.
void BlockRenderer
console.log('✓ BlockRenderer module loaded successfully')

// Confirm extract-block-props exports are intact
import * as extractors from '../src/lib/assembly/extract-block-props'

const expectedExtractors = [
  'extractHeroProps',
  'extractHeroSplitProps',
  'extractPageHeaderProps',
  'extractIntroTextProps',
  'extractContentSplitProps',
  'extractContentProseProps',
  'extractChecklistSectionProps',
  'extractProcessStepsProps',
  'extractFeatureGridProps',
  'extractServiceCardsProps',
  'extractContentCardsProps',
  'extractTeamGridProps',
  'extractIndustryCardsProps',
  'extractTestimonialsProps',
  'extractStatsBarProps',
  'extractLogoBarProps',
  'extractCtaBannerProps',
  'extractPricingProps',
  'extractFaqAccordionProps',
  'extractFormProps',
  'extractContentTableProps',
]

let allFound = true
for (const name of expectedExtractors) {
  const fn = (extractors as Record<string, unknown>)[name]
  if (typeof fn !== 'function') {
    console.log(`✗ missing extractor: ${name}`)
    allFound = false
  }
}

if (allFound) {
  console.log(`✓ All 21 extractors present`)
  process.exit(0)
} else {
  process.exit(1)
}
