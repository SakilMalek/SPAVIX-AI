export interface MatchedProduct {
  id: string;
  title: string;
  price: string;
  image: string;
  url: string;
  source: 'amazon' | 'flipkart' | 'wayfair';
  similarity: number;
  affiliateUrl?: string;
}

export interface ProductMatch {
  detectedItemId: string;
  detectedItemName: string;
  matches: MatchedProduct[];
  bestMatch?: MatchedProduct;
}

export class ProductMatchingService {
  private amazonAffiliateId: string;
  private flipkartAffiliateId: string;

  constructor(amazonAffiliateId?: string, flipkartAffiliateId?: string) {
    this.amazonAffiliateId = amazonAffiliateId || process.env.AMAZON_AFFILIATE_ID || '';
    this.flipkartAffiliateId = flipkartAffiliateId || process.env.FLIPKART_AFFILIATE_ID || '';
  }

  async matchProductsForItem(itemName: string, category: string): Promise<MatchedProduct[]> {
    try {
      console.log(`[ProductMatching] Searching for: ${itemName}`);

      const matches: MatchedProduct[] = [];

      const amazonResults = await this.searchAmazon(itemName, category);
      matches.push(...amazonResults);

      const flipkartResults = await this.searchFlipkart(itemName, category);
      matches.push(...flipkartResults);

      matches.sort((a, b) => b.similarity - a.similarity);

      console.log(`[ProductMatching] Found ${matches.length} matches for ${itemName}`);
      return matches.slice(0, 5);
    } catch (error: any) {
      console.error(`[ProductMatching] Error matching products for ${itemName}:`, error.message);
      return [];
    }
  }

  private async searchAmazon(query: string, category: string): Promise<MatchedProduct[]> {
    try {
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
      const affiliateUrl = this.buildAmazonAffiliateUrl(query);

      return [
        {
          id: `amazon_${query.replace(/\s+/g, '_')}`,
          title: `${query} - Amazon Result`,
          price: '$100-$500',
          image: 'https://via.placeholder.com/200',
          url: searchUrl,
          source: 'amazon',
          similarity: 85,
          affiliateUrl: affiliateUrl,
        },
      ];
    } catch (error: any) {
      console.error('[ProductMatching] Amazon search error:', error.message);
      return [];
    }
  }

  private async searchFlipkart(query: string, category: string): Promise<MatchedProduct[]> {
    try {
      const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
      const affiliateUrl = this.buildFlipkartAffiliateUrl(query);

      return [
        {
          id: `flipkart_${query.replace(/\s+/g, '_')}`,
          title: `${query} - Flipkart Result`,
          price: '₹5,000-₹25,000',
          image: 'https://via.placeholder.com/200',
          url: searchUrl,
          source: 'flipkart',
          similarity: 80,
          affiliateUrl: affiliateUrl,
        },
      ];
    } catch (error: any) {
      console.error('[ProductMatching] Flipkart search error:', error.message);
      return [];
    }
  }

  private buildAmazonAffiliateUrl(query: string): string {
    const baseUrl = 'https://amazon.com/s';
    const params = new URLSearchParams({
      k: query,
      tag: this.amazonAffiliateId || 'spavix-20',
    });
    return `${baseUrl}?${params.toString()}`;
  }

  private buildFlipkartAffiliateUrl(query: string): string {
    const baseUrl = 'https://www.flipkart.com/search';
    const params = new URLSearchParams({
      q: query,
      affid: this.flipkartAffiliateId || 'spavix',
    });
    return `${baseUrl}?${params.toString()}`;
  }

  calculateSimilarity(detectedItem: string, productTitle: string): number {
    const detectedWords = detectedItem.toLowerCase().split(/\s+/);
    const productWords = productTitle.toLowerCase().split(/\s+/);

    const matches = detectedWords.filter((word) =>
      productWords.some((pWord) => pWord.includes(word) || word.includes(pWord))
    );

    return Math.round((matches.length / Math.max(detectedWords.length, productWords.length)) * 100);
  }
}
