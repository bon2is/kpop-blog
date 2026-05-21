import Image from 'next/image';
import { searchCoupangProducts, getCoupangKeyword, CoupangProduct } from '@/lib/coupang';

interface Props {
  category?: string;
  tags?: string[];
  keyword?: string;
  title?: string;
  limit?: number;
  className?: string;
}

function ProductCard({ product }: { product: CoupangProduct }) {
  const discountPct =
    product.originalPrice && product.originalPrice > product.salePrice
      ? Math.round(((product.originalPrice - product.salePrice) / product.originalPrice) * 100)
      : 0;

  return (
    <a
      href={product.productUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex flex-col rounded-lg border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={product.productImage}
          alt={product.productName}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          {product.isRocket && (
            <span className="text-[9px] font-bold bg-[#e44] text-white px-1.5 py-0.5 rounded-full leading-none">
              Rocket
            </span>
          )}
          {discountPct > 0 && (
            <span className="text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
              {discountPct}%
            </span>
          )}
        </div>
      </div>
      <div className="p-2 flex flex-col gap-1 flex-1">
        <p className="text-[11px] text-gray-700 line-clamp-2 leading-snug">{product.productName}</p>
        <div className="mt-auto">
          <p className="text-sm font-bold text-gray-900">₩{product.salePrice.toLocaleString()}</p>
          {product.isFreeShipping && (
            <p className="text-[10px] text-blue-500 font-medium">Free Delivery</p>
          )}
        </div>
      </div>
    </a>
  );
}

export default async function CoupangBanner({
  category = 'etc',
  tags = [],
  keyword,
  title,
  limit = 4,
  className = '',
}: Props) {
  const searchKeyword = keyword ?? getCoupangKeyword(category, tags);
  const products = await searchCoupangProducts(searchKeyword, limit);

  if (products.length === 0) {
    const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(searchKeyword)}`;
    return (
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={`flex items-center justify-between p-4 rounded-xl border border-orange-100 bg-orange-50 hover:bg-orange-100 transition-colors group ${className}`}
      >
        <div>
          <p className="text-sm font-semibold text-gray-800">{title ?? searchKeyword}</p>
          <p className="text-xs text-gray-500 mt-0.5">Browse on Coupang →</p>
        </div>
        <span className="text-xs font-bold text-orange-500 bg-white px-2 py-1 rounded-full border border-orange-200">
          Coupang
        </span>
      </a>
    );
  }

  return (
    <div className={`my-8 rounded-xl border border-gray-100 bg-gray-50 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 leading-none">
          Coupang Partners
        </span>
        <p className="text-sm font-semibold text-gray-700">{title ?? `${searchKeyword} Picks`}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.map((p) => (
          <ProductCard key={p.productId} product={p} />
        ))}
      </div>
      <p className="mt-3 text-[10px] text-gray-400 leading-relaxed">
        This content is part of the Coupang Partners program. We may receive a commission on qualifying purchases.
      </p>
    </div>
  );
}
