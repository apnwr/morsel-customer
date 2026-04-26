import { LoadingScreen } from '@/components/ui/LoadingScreen';

/**
 * Next.js convention: loading UI for /cart. Rendered while the route segment
 * loads. Uses the shared branded LoadingScreen so all page-level loading
 * states share the same visual language.
 */
export default function CartLoading() {
  return <LoadingScreen />;
}
