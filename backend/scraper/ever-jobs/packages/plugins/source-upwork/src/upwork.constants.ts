/**
 * Default number of Upwork job results to fetch.
 */
export const DEFAULT_NUM_RESULTS = 20;

/**
 * Default sort field for job search results.
 * RECENCY returns the most recently posted jobs first.
 */
export const DEFAULT_SORT_FIELD = 'RECENCY';

/**
 * GraphQL query for searching Upwork marketplace job postings.
 *
 * Uses the `marketplaceJobPostings` query which is the current
 * supported method after deprecation of the REST search endpoint.
 *
 * Available fields on each node:
 *   id, title, description, createdDateTime,
 *   ciphertext (used to build the job URL),
 *   duration, engagement, amount { amount, currencyCode },
 *   category { name }, subcategory { name },
 *   skills { name }, client { totalPostedJobs, totalHires },
 *   weeklyBudget { amount, currencyCode },
 *   contractorTier (ENTRY, INTERMEDIATE, EXPERT)
 */
export const JOB_SEARCH_QUERY = `
  query JobSearch($searchTerm: String, $first: Int, $sortField: MarketplaceJobPostingSortField) {
    marketplaceJobPostings(
      marketPlaceJobFilter: {
        searchTerm_eq: { andTerms_all: $searchTerm }
      }
      searchType: USER_JOBS_SEARCH
      sortAttributes: { field: $sortField, sortOrder: DESC }
      pagination: { first: $first }
    ) {
      totalCount
      edges {
        node {
          id
          ciphertext
          title
          description
          createdDateTime
          duration
          engagement
          amount {
            amount
            currencyCode
          }
          weeklyBudget {
            amount
            currencyCode
          }
          category {
            name
          }
          subcategory {
            name
          }
          skills {
            name
          }
          client {
            totalPostedJobs
            totalHires
          }
          contractorTier
        }
      }
    }
  }
`;
