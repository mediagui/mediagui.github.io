# Prevent local builds from crashing when jupyter is not installed.
# Keeps notebook support intact when the binary is available.
require "cgi"

module JekyllJupyterNotebook
  class Converter
    alias_method :convert_notebook_without_fallback, :convert_notebook unless method_defined?(:convert_notebook_without_fallback)

    private

    def convert_notebook(content, config)
      convert_notebook_without_fallback(content, config)
    rescue Errno::ENOENT => e
      raise unless e.message.include?("jupyter")

      Jekyll.logger.warn(
        "Jupyter Notebook:",
        "Skipping notebook conversion because 'jupyter' is not installed in PATH."
      )

      <<~HTML
        <div class="alert alert-warning" role="alert">
          Notebook conversion skipped: the <code>jupyter</code> executable is not available in this build environment.
        </div>
      HTML
    end
  end
end
