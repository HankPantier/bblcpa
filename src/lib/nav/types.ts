export type NavItem = {
  label: string
  url: string
  children?: NavItem[]
}

export type NavJson = {
  primary: NavItem[]
  cta?: { label: string; url: string }
}
