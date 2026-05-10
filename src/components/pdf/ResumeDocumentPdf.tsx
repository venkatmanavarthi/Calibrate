import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
} from '@react-pdf/renderer'
import type { ResumeDocument, ResumeDocumentSection, ResumeDocumentEntry } from '../../types/resume-document'

interface StyleConfig {
  font: string
  fontSize: number
  lineHeight: number
  pageSize: 'LETTER' | 'A4'
  marginPt: number
  paddingTopPt: number
  paddingRightPt: number
  paddingBottomPt: number
  paddingLeftPt: number
  primaryColor?: string
  metaColor?: string
  accentColor?: string
}

function makeStyles(cfg: StyleConfig) {
  const { fontSize: fs, lineHeight: lh } = cfg
  const primary = cfg.primaryColor ?? '#111111'
  const meta = cfg.metaColor ?? '#555555'
  const accent = cfg.accentColor ?? '#aaaaaa'
  return StyleSheet.create({
    page: {
      fontFamily: cfg.font,
      fontSize: fs,
      lineHeight: lh,
      paddingTop: cfg.paddingTopPt,
      paddingRight: cfg.paddingRightPt,
      paddingBottom: cfg.paddingBottomPt,
      paddingLeft: cfg.paddingLeftPt,
      color: primary,
    },
    name: {
      fontSize: Math.round(fs * 1.8),
      fontFamily: cfg.font,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 3,
    },
    contactLine: {
      fontSize: Math.round(fs * 0.9),
      textAlign: 'center',
      color: '#444444',
      marginBottom: 3,
    },
    contactSeparator: {
      color: '#888888',
    },
    divider: {
      borderBottomWidth: 0.75,
      borderBottomColor: meta,
      marginTop: 4,
      marginBottom: 6,
    },
    sectionContainer: {
      marginTop: 8,
    },
    sectionHeading: {
      fontSize: fs,
      fontFamily: cfg.font,
      fontWeight: 'bold',
      marginBottom: 1,
    },
    sectionDivider: {
      borderBottomWidth: 0.5,
      borderBottomColor: accent,
      marginBottom: 4,
    },
    entryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    entryTitle: {
      fontFamily: cfg.font,
      fontWeight: 'bold',
      fontSize: fs,
    },
    entryMeta: {
      fontSize: Math.round(fs * 0.9),
      color: meta,
    },
    entrySubRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 1,
    },
    entrySubtitle: {
      fontFamily: cfg.font,
      fontSize: fs,
      fontStyle: 'italic',
    },
    entryBody: {
      fontSize: fs,
      lineHeight: lh,
      marginTop: 2,
    },
    bulletRow: {
      flexDirection: 'row',
      marginTop: 1,
      paddingLeft: 8,
    },
    bulletDot: {
      width: 10,
      fontSize: fs,
    },
    bulletText: {
      flex: 1,
      fontSize: fs,
      lineHeight: lh,
    },
    skillsText: {
      fontSize: fs,
      lineHeight: lh,
      marginTop: 2,
    },
    summaryText: {
      fontSize: fs,
      lineHeight: lh,
      marginTop: 4,
    },
  })
}

// Parses **bold** markdown and returns react-pdf Text fragments
function renderInlineMarkdown(text: string, baseStyle: object, boldFont: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ ...baseStyle, fontFamily: boldFont, fontWeight: 'bold' }}>
          {part.slice(2, -2)}
        </Text>
      )
    }
    return <Text key={i} style={baseStyle}>{part}</Text>
  })
}

function urlHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function urlDisplay(value: string): string {
  return value.replace(/^https?:\/\//i, '')
}

function telHref(value: string): string {
  return value.startsWith('tel:') ? value : `tel:${value.replace(/\s/g, '')}`
}

function ContactLine({ contact, styles }: { contact: ResumeDocument['contact']; styles: ReturnType<typeof makeStyles> }) {
  const parts: { value: string; field: string }[] = []
  if (contact.email) parts.push({ field: 'email', value: contact.email })
  if (contact.phone) parts.push({ field: 'phone', value: contact.phone })
  if (contact.location) parts.push({ field: 'location', value: contact.location })
  if (contact.linkedin) parts.push({ field: 'linkedin', value: contact.linkedin })
  if (contact.github) parts.push({ field: 'github', value: contact.github })
  if (contact.website) parts.push({ field: 'website', value: contact.website })

  if (!parts.length) return null

  return (
    <Text style={styles.contactLine}>
      {parts.map(({ field, value }, i) => (
        <React.Fragment key={i}>
          {field === 'location' ? (
            <Text style={{ color: '#444444' }}>{value}</Text>
          ) : field === 'phone' ? (
            <Link src={telHref(value)} style={{ color: '#444444', textDecoration: 'none' }}>{value}</Link>
          ) : (
            <Link src={field === 'email' ? (value.startsWith('mailto:') ? value : `mailto:${value}`) : urlHref(value)} style={{ color: '#444444', textDecoration: 'none' }}>{field === 'email' ? value : urlDisplay(value)}</Link>
          )}
          {i < parts.length - 1 && <Text style={styles.contactSeparator}>  |  </Text>}
        </React.Fragment>
      ))}
    </Text>
  )
}

function Bullet({ text, styles, font }: { text: string; styles: ReturnType<typeof makeStyles>; font: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{renderInlineMarkdown(text, styles.bulletText, font)}</Text>
    </View>
  )
}

function Entry({ entry, styles, font }: { entry: ResumeDocumentEntry; styles: ReturnType<typeof makeStyles>; font: string }) {
  return (
    <View>
      <View style={styles.entryRow}>
        <Text style={styles.entryTitle}>{entry.left}</Text>
        {entry.right && <Text style={styles.entryMeta}>{entry.right}</Text>}
      </View>
      {(entry.subleft || entry.subright) && (
        <View style={styles.entrySubRow}>
          <Text style={styles.entrySubtitle}>{entry.subleft ?? ''}</Text>
          {entry.subright && <Text style={styles.entryMeta}>{entry.subright}</Text>}
        </View>
      )}
      {entry.body && <Text style={styles.entryBody}>{renderInlineMarkdown(entry.body, styles.entryBody, font)}</Text>}
      {entry.bullets?.map((b, i) => <Bullet key={i} text={b} styles={styles} font={font} />)}
    </View>
  )
}

function Section({ section, styles, font }: { section: ResumeDocumentSection; styles: ReturnType<typeof makeStyles>; font: string }) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeading}>{section.title.toUpperCase()}</Text>
      <View style={styles.sectionDivider} />

      {section.layout === 'summary' && section.text && (
        <Text style={styles.summaryText}>{renderInlineMarkdown(section.text, styles.summaryText, font)}</Text>
      )}

      {section.layout === 'skills' && section.skills?.length && (
        section.skills.some(s => s.includes('**'))
          ? section.skills.map((skill, i) => (
              <Text key={i} style={styles.skillsText}>
                {renderInlineMarkdown(skill, styles.skillsText, font)}
              </Text>
            ))
          : <Text style={styles.skillsText}>{section.skills.join('  ·  ')}</Text>
      )}

      {section.layout === 'entries' && section.entries?.map((entry, i) => (
        <Entry key={i} entry={entry} styles={styles} font={font} />
      ))}
    </View>
  )
}

export function ResumeDocumentPdf({
  doc,
  cfg,
}: {
  doc: ResumeDocument
  cfg: StyleConfig
}) {
  const mergedCfg: StyleConfig = {
    ...cfg,
    primaryColor: doc.metadata?.primaryColor ?? cfg.primaryColor,
    metaColor: doc.metadata?.metaColor ?? cfg.metaColor,
    accentColor: doc.metadata?.accentColor ?? cfg.accentColor,
  }
  const styles = makeStyles(mergedCfg)
  return (
    <Document>
      <Page size={cfg.pageSize} style={styles.page}>
        <Text style={styles.name}>{doc.contact.name}</Text>
        <ContactLine contact={doc.contact} styles={styles} />
        {doc.sections.filter(s => !s.hidden).map((section, i) => (
          <Section key={i} section={section} styles={styles} font={mergedCfg.font} />
        ))}
      </Page>
    </Document>
  )
}

export type { StyleConfig }
