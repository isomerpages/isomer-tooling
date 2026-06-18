# Helper function to replace "-" with "Not Available"
def replace_na(value):
  return "Not Available" if value == "-" or value == 'n/a' else "$" + str(value)

# Helper function to display the fees with GST inclusive
def get_fees_with_gst(fees):
  if fees is None or fees['Lower bound'] == "Not available" or fees['Upper bound'] == "Not available":
    return [{
      "type": "text",
      "marks": [
        {
          "type": "italic"
        }
      ],
      "text": "Not Available"
    }]

  lower_gst = round(float(fees['Lower bound'].replace(",", "")) * 1.09, 2)
  lower_gst_str = "${:,.0f}".format(lower_gst) if lower_gst.is_integer() else "${:,.2f}".format(lower_gst)
  upper_gst = round(float(fees['Upper bound'].replace(",", "")) * 1.09, 2)
  upper_gst_str = "${:,.0f}".format(upper_gst) if upper_gst.is_integer() else "${:,.2f}".format(upper_gst)

  return [
    {
      "type": "text",
      "text": lower_gst_str + " - " + upper_gst_str + " w/GST"
    },
    {
      "type": "hardBreak"
    },
    {
      "type": "text",
      "text": "($" + fees['Lower bound'] + " - $" + fees['Upper bound'] + " w/o GST)"
    }
  ]
