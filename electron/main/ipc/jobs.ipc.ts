import { ipcMain } from 'electron'
import {
  listCompanies,
  saveCompany,
  deleteCompany,
  listJobs,
  upsertJobs
} from '../storage/jobs.store'
import { fetchCompanyJobs } from '../jobs/adapters'
import type { TrackedCompany, JobRefreshResult } from '../../../src/types/models'

export function registerJobsIpc(): void {
  ipcMain.handle('jobs:listCompanies', () => listCompanies())

  ipcMain.handle('jobs:saveCompany', async (_, company: TrackedCompany) => {
    await saveCompany(company)
    return { ok: true as const }
  })

  ipcMain.handle('jobs:deleteCompany', async (_, id: string) => {
    await deleteCompany(id)
    return { ok: true as const }
  })

  ipcMain.handle('jobs:listJobs', () => listJobs())

  ipcMain.handle('jobs:refreshCompany', async (_, id: string): Promise<JobRefreshResult> => {
    const companies = await listCompanies()
    const company = companies.find((c) => c.id === id)
    if (!company) return { companyId: id, fetched: 0, added: 0, errors: 'Company not found' }
    try {
      const jobs = await fetchCompanyJobs(company)
      const added = await upsertJobs(company.id, jobs)
      return { companyId: id, fetched: jobs.length, added }
    } catch (e) {
      return { companyId: id, fetched: 0, added: 0, errors: (e as Error).message }
    }
  })

  ipcMain.handle('jobs:refreshAll', async (): Promise<JobRefreshResult[]> => {
    const companies = await listCompanies()
    return Promise.all(
      companies.map(async (company): Promise<JobRefreshResult> => {
        try {
          const jobs = await fetchCompanyJobs(company)
          const added = await upsertJobs(company.id, jobs)
          return { companyId: company.id, fetched: jobs.length, added }
        } catch (e) {
          return { companyId: company.id, fetched: 0, added: 0, errors: (e as Error).message }
        }
      })
    )
  })
}
