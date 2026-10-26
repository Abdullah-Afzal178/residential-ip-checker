export const SITE_NAME = "Residential IP Checker";

export const PAGE_TITLE = "Residential or Datacenter IP Checker";

export const PAGE_DESCRIPTION =
  "Check whether an IP address is residential, mobile, business or datacenter. See which network records agree, which disagree, and check up to 50 addresses at once.";

export const POWERED_BY_URL = "https://ipgeolocation.io";

export const SECURITY_API_URL = "https://ipgeolocation.io/ip-security-api.html";

export const EXAMPLES = [
  { query: "73.162.45.10", label: "Home cable" },
  { query: "172.58.100.20", label: "Mobile" },
  { query: "159.89.100.10", label: "Cloud server" },
  { query: "1.1.1.1", label: "Anycast" },
  { query: "18.7.22.83", label: "University" },
  {
    query: "73.162.45.10\n172.58.100.20\n3.5.140.2\n98.97.10.10\n104.16.132.229\n157.240.1.35\n18.7.22.83\n49.36.10.10",
    label: "A list of eight",
  },
];
