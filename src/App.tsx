import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { BottomTabs } from './components/BottomTabs';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SiteHeader } from './components/SiteHeader';
import { HomePage } from './pages/HomePage';
import { queryClient } from './queryClient';

const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage').then((module) => ({ default: module.ArticleDetailPage })));
const RecentPage = lazy(() => import('./recent/RecentPage').then((module) => ({ default: module.RecentPage })));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage').then((module) => ({ default: module.ArticlesPage })));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage').then((module) => ({ default: module.CompaniesPage })));
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage').then((module) => ({ default: module.CompanyDetailPage })));
const LaunchDetailPage = lazy(() => import('./pages/LaunchDetailPage').then((module) => ({ default: module.LaunchDetailPage })));
const LaunchesPage = lazy(() => import('./pages/LaunchesPage').then((module) => ({ default: module.LaunchesPage })));
const PolicyPage = lazy(() => import('./pages/PolicyPage').then((module) => ({ default: module.PolicyPage })));
const TopicDetailPage = lazy(() => import('./pages/TopicDetailPage').then((module) => ({ default: module.TopicDetailPage })));
const TopicsPage = lazy(() => import('./pages/TopicsPage').then((module) => ({ default: module.TopicsPage })));

export function AppRoutes() {
  const location = useLocation();
  if (location.pathname === '/recent' || location.pathname.startsWith('/recent/')) {
    return <Suspense fallback={<div className="inline-status">近期资讯加载中。</div>}><RecentPage /></Suspense>;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <main className="app-shell">
        <SiteHeader />
        <ErrorBoundary>
          <Suspense fallback={<div className="inline-status" role="status">页面加载中。</div>}>
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
              <Route path="*" element={
                <section className="panel">
                  <h1>未找到页面</h1>
                  <Link to="/">返回首页</Link>
                </section>
              } />
            </Routes>
          </Suspense>
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
