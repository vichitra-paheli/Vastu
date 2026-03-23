/**
 * mockPages — placeholder page registry for US-109.
 *
 * Real page data will come from the panel registry in a later story.
 * Each entry represents a page that can be opened as a Dockview panel.
 */

export interface MockPage {
  id: string;
  title: string;
  /** Tabler icon name (without 'Icon' prefix) */
  iconName: string;
}

export const MOCK_PAGES: MockPage[] = [
  { id: 'dashboard', title: 'Dashboard', iconName: 'LayoutDashboard' },
  { id: 'customers', title: 'Customers', iconName: 'Users' },
  { id: 'orders', title: 'Orders', iconName: 'ShoppingCart' },
  { id: 'products', title: 'Products', iconName: 'Package' },
  { id: 'analytics', title: 'Analytics', iconName: 'ChartBar' },
  { id: 'reports', title: 'Reports', iconName: 'FileText' },
  { id: 'invoices', title: 'Invoices', iconName: 'Receipt' },
];
