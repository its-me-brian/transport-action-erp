/**
 * Safely extract an error message from an unknown caught value.
 * Replaces the widespread `catch (err: any)` pattern with type-safe handling.
 *
 * Usage:
 *   } catch (err) {
 *     showToast(getErrorMessage(err), 'error');
 *   }
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Ha ocurrido un error inesperado';
}
