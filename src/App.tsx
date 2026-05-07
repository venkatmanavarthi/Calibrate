import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import ProfileList from '@/pages/profiles/ProfileList'
import ProfileEditor from '@/pages/profiles/ProfileEditor'
import TemplateList from '@/pages/templates/TemplateList'
import TemplateEditor from '@/pages/templates/TemplateEditor'
import GeneratorPage from '@/pages/generator/GeneratorPage'
import PromptsPage from '@/pages/prompts/PromptsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profiles" element={<ProfileList />} />
        <Route path="/profiles/new" element={<ProfileEditor />} />
        <Route path="/profiles/:id" element={<ProfileEditor />} />
        <Route path="/templates" element={<TemplateList />} />
        <Route path="/templates/new" element={<TemplateEditor />} />
        <Route path="/templates/:id" element={<TemplateEditor />} />
        <Route path="/generate" element={<GeneratorPage />} />
        <Route path="/prompts" element={<PromptsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  )
}
