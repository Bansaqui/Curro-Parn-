import type { FormState } from "../../src/lib/utils/errors";
export async function simulated(): Promise<FormState> {
  await new Promise((resolve) => setTimeout(resolve, 6000));
  return {
    error: "No hemos podido completar la operación. Inténtalo de nuevo.",
  };
}
export {
  simulated as completeOnboarding,
  simulated as login,
  simulated as register,
  simulated as recoverPassword,
  simulated as updatePassword,
  simulated as logout,
  simulated as saveBusiness,
  simulated as saveVenue,
  simulated as saveJob,
  simulated as sendInterest,
};
