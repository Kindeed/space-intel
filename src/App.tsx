import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { BottomTabs } from './components/BottomTabs';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SiteHeader } from './components/SiteHeader';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { HomePage } from './pages/HomePage';
import { LaunchDetailPage } from './pages/LaunchDetailPage';
import { LaunchesPage } from './pages/LaunchesPage';
import { PolicyPage } from './pages/PolicyPage';
import { TopicDetailPage } from './pages/TopicDetailPage';
import { TopicsPage } from './pages/TopicsPage';
import { queryClient } from './queryClient';

export function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="app-shell">
        <SiteHeader />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:slug" element={<ArticleDetailPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/:slug" element={<CompanyDetailPage />} />
            <Route path="/launches" element={<LaunchesPage />} />
            <Route path="/launches/:slug" element={<LaunchDetailPage />} />
            <Route path="/official" element={<PolicyPage />} />
            <Route path="/policy" element={<PolicyPage />} />
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/topics/:slug" element={<TopicDetailPage />} />
          </Routes>
        </ErrorBoundary>
        <BottomTabs />
      </main>
    </QueryClientProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
