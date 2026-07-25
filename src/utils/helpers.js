// src/utils/helpers.js

export const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", country: "India" },
  { code: "+1", flag: "🇺🇸", country: "USA/Canada" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+971", flag: "🇦🇪", country: "UAE" },
  { code: "+61", flag: "🇦🇺", country: "Australia" },
  { code: "+92", flag: "🇵🇰", country: "Pakistan" },
  { code: "+880", flag: "🇧🇩", country: "Bangladesh" },
  { code: "+977", flag: "🇳🇵", country: "Nepal" },
  { code: "+94", flag: "🇱🇰", country: "Sri Lanka" },
  { code: "+65", flag: "🇸🇬", country: "Singapore" },
];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export const CURRENT_YEAR = new Date().getFullYear();
export const CURRENT_DAY = new Date().getDate();

export const isBeforeJoiningDate = (joiningDateStr, targetYearStr, targetMonthName) => {
  if (!joiningDateStr) return false;
  const joiningDate = new Date(joiningDateStr);
  const targetMonthIndex = MONTHS.indexOf(targetMonthName);
  const targetYear = parseInt(targetYearStr, 10);

  const joiningYear = joiningDate.getFullYear();
  const joiningMonthIndex = joiningDate.getMonth();

  if (targetYear < joiningYear) return true;
  if (targetYear === joiningYear && targetMonthIndex < joiningMonthIndex) return true;

  return false;
};

export const formatPhoneNumber = (phoneStr) => {
  if (!phoneStr || phoneStr === "N/A") return "N/A";
  const trimmed = phoneStr.trim();
  // Format 10 digit local numbers into standard readable spacing if possible
  const parts = trimmed.split(" ");
  if (parts.length === 2 && parts[1].length === 10) {
    return `${parts[0]} ${parts[1].slice(0, 5)} ${parts[1].slice(5)}`;
  }
  return trimmed;
};

export const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case "auth/invalid-credential":
      return "Incorrect email or password. Please check your credentials.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Access temporarily blocked.";
    default:
      return "An error occurred during authentication.";
  }
};