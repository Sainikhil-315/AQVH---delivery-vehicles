import toast from 'react-hot-toast'

export const useNotifications = () => {
  const notify = {
    success: (message, options = {}) => {
      toast.success(message, {
        duration: 4000,
        position: 'top-right',
        ...options
      })
    },

    error: (message, options = {}) => {
      toast.error(message, {
        duration: 5000,
        position: 'top-right',
        ...options
      })
    },

    loading: (message, options = {}) => {
      return toast.loading(message, {
        position: 'top-right',
        ...options
      })
    },

    info: (message, options = {}) => {
      toast(message, {
        duration: 4000,
        position: 'top-right',
        icon: 'ℹ️',
        ...options
      })
    },

    dismiss: (toastId) => {
      if (toastId) {
        toast.dismiss(toastId)
      } else {
        toast.dismiss()
      }
    },

    promise: (promise, messages, options = {}) => {
      return toast.promise(promise, messages, {
        position: 'top-right',
        ...options
      })
    }
  }

  return notify
}