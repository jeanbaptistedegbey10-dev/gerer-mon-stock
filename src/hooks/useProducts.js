import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

// ─── Compression image → max 8ko ─────────────────────────────────────────────
export async function compressImage(file, maxKb = 8) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas  = document.createElement('canvas')
        let quality   = 0.9
        let { width, height } = img

        // Réduire les dimensions si trop grand
        const maxDim = 200
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width  = maxDim
          } else {
            width  = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width  = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Boucle de compression jusqu'à < maxKb
        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (blob.size / 1024 > maxKb && quality > 0.1) {
                quality -= 0.1
                compress()
              } else {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }))
              }
            },
            'image/jpeg',
            quality
          )
        }
        compress()
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ─── Upload vers Supabase Storage ────────────────────────────────────────────
export async function uploadProductImage(file, userId) {
  const compressed = await compressImage(file, 8)
  const ext        = 'jpg'
  const path       = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, compressed, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(path)

  return data.publicUrl
}

export function useProducts() {
  const { user } = useStore()
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const createProduct = async (formData) => {
    const { error } = await supabase
      .from('products')
      .insert({ ...formData, user_id: user.id })
    if (error) throw error
    await fetch()
  }

  const updateProduct = async (id, formData) => {
    const { error } = await supabase
      .from('products')
      .update(formData)
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }

  const deleteProduct = async (id) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  // Fournisseurs uniques extraits des produits
  const suppliers = [...new Set(
    products.map(p => p.supplier).filter(Boolean)
  )]

  const stats = {
    total:        products.length,
    lowStock:     products.filter(p => p.quantity <= p.low_stock_threshold).length,
    totalValue:   products.reduce((s, p) => s + p.purchase_price * p.quantity, 0),
    totalRevenue: products.reduce((s, p) => s + p.sale_price    * p.quantity, 0),
  }

  return {
    products, loading, error, stats, suppliers,
    refresh: fetch, createProduct, updateProduct, deleteProduct,
  }
}