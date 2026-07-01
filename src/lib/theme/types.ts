export type Roundness = 'sharp' | 'soft' | 'pill'
export type Density = 'tight' | 'balanced' | 'airy'
export type VisualFeel = 'classic' | 'modern' | 'editorial'

export type DesignJson = {
  typography: {
    headingFont: string
    bodyFont: string
    googleFontsUrl: string
  }
  roundness: Roundness
  density: Density
  visualFeel: VisualFeel
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
  radius: {
    none: string
    sm: string
    md: string
    lg: string
    pill: string
  }
}
